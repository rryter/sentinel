import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AnalysisJobsService,
  ApiV1AnalysisJobsRuleHistoryGet200Response,
} from '@sentinel/api';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';

Chart.register(...registerables);

interface RuleCategory {
  name: string;
  expanded: boolean;
  rules: RuleInfo[];
}

interface RuleInfo {
  name: string;
  checked: boolean;
  count: number;
}

@Component({
  selector: 'lib-lint-history',
  imports: [CommonModule, FormsModule],
  templateUrl: './lint-history.component.html',
  styleUrls: ['./lint-history.component.css'],
})
export class LintHistoryComponent implements OnInit, AfterViewInit {
  @ViewChild('violationsChart', { static: false })
  chartCanvas!: ElementRef<HTMLCanvasElement>;

  private readonly analysisJobsService = inject(AnalysisJobsService);
  private chart: Chart | null = null;

  readonly projectId = input.required<number>();
  readonly apiData = signal<ApiV1AnalysisJobsRuleHistoryGet200Response | null>(
    null,
  );
  readonly searchTerm = signal<string>('');
  readonly selectedTimeRange = signal<string>('All');

  readonly categories = signal<RuleCategory[]>([]);

  readonly filteredCategories = computed(() => {
    const search = this.searchTerm().toLowerCase();
    if (!search) return this.categories();

    return this.categories()
      .map((cat) => ({
        ...cat,
        rules: cat.rules.filter((rule) =>
          rule.name.toLowerCase().includes(search),
        ),
      }))
      .filter((cat) => cat.rules.length > 0);
  });

  readonly selectedRules = computed(() => {
    return this.categories()
      .flatMap((cat) => cat.rules)
      .filter((rule) => rule.checked)
      .map((rule) => rule.name);
  });

  ngOnInit() {
    this.loadData();
  }

  ngAfterViewInit() {
    setTimeout(() => this.updateChart(), 500);
  }

  loadData() {
    this.analysisJobsService
      .apiV1AnalysisJobsRuleHistoryGet({ projectId: this.projectId() })
      .subscribe({
        next: (data) => {
          this.apiData.set(data);
          this.processRulesFromData(data);
        },
        error: (error) => {
          console.error('Error loading rule history:', error);
        },
      });
  }

  processRulesFromData(data: ApiV1AnalysisJobsRuleHistoryGet200Response) {
    // Aggregate all unique rules from all jobs
    const ruleMap = new Map<string, number>();

    data.data.forEach((job) => {
      job.rules.forEach((rule) => {
        const current = ruleMap.get(rule.rule_name) || 0;
        ruleMap.set(rule.rule_name, Math.max(current, rule.violations_count));
      });
    });

    // Categorize rules
    const angularRules: RuleInfo[] = [];
    const typescriptRules: RuleInfo[] = [];
    const otherRules: RuleInfo[] = [];

    ruleMap.forEach((count, ruleName) => {
      const ruleInfo: RuleInfo = {
        name: ruleName,
        checked: true, // Check all by default
        count: count,
      };

      if (ruleName.startsWith('angular-')) {
        angularRules.push(ruleInfo);
      } else if (ruleName.startsWith('typescript-')) {
        typescriptRules.push(ruleInfo);
      } else {
        otherRules.push(ruleInfo);
      }
    });

    const categories: RuleCategory[] = [];

    if (angularRules.length > 0) {
      categories.push({
        name: 'Angular Specific',
        expanded: true,
        rules: angularRules,
      });
    }
    if (typescriptRules.length > 0) {
      categories.push({
        name: 'TypeScript',
        expanded: true,
        rules: typescriptRules,
      });
    }
    if (otherRules.length > 0) {
      categories.push({ name: 'Other', expanded: true, rules: otherRules });
    }

    this.categories.set(categories);
  }

  toggleCategory(category: RuleCategory) {
    category.expanded = !category.expanded;
    this.categories.set([...this.categories()]);
  }

  toggleRule(rule: RuleInfo) {
    rule.checked = !rule.checked;
    this.categories.set([...this.categories()]);
  }

  clearAll() {
    this.categories().forEach((cat) => {
      cat.rules.forEach((rule) => (rule.checked = false));
    });
    this.categories.set([...this.categories()]);
    this.updateChart();
  }

  applySelection() {
    this.updateChart();
  }

  selectTimeRange(range: string) {
    this.selectedTimeRange.set(range);
    this.updateChart();
  }

  updateChart() {
    if (!this.chartCanvas || !this.apiData()) return;

    const selectedRuleNames = this.selectedRules();
    if (selectedRuleNames.length === 0) {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
      return;
    }

    const data = this.apiData()!;
    const colors = this.generateColors(selectedRuleNames.length);

    // Create datasets for each selected rule
    const datasets = selectedRuleNames.map((ruleName, index) => {
      const dataPoints = data.data.map((job) => {
        const rule = job.rules.find((r) => r.rule_name === ruleName);
        return rule ? rule.violations_count : 0;
      });

      return {
        label: ruleName,
        data: dataPoints,
        borderColor: colors[index],
        backgroundColor: colors[index] + '20',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 6,
      };
    });

    const labels = data.data.map((job) => {
      const date = new Date(job.created_at);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    });

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          title: {
            display: false,
          },
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              title: (context) => {
                const index = context[0].dataIndex;
                const job = data.data[index];
                return `Job #${job.job_id}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: true,
              color: '#e5e7eb',
            },
            ticks: {
              color: '#6b7280',
              maxRotation: 45,
              minRotation: 0,
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              display: true,
              color: '#e5e7eb',
            },
            ticks: {
              color: '#6b7280',
              precision: 0,
            },
            title: {
              display: true,
              text: 'Number of Violations',
              color: '#6b7280',
              font: {
                size: 12,
              },
            },
          },
        },
      },
    };

    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.chart = new Chart(ctx, config);
    }
  }

  generateColors(count: number): string[] {
    const baseColors = [
      '#ef4444', // red
      '#f59e0b', // amber
      '#3b82f6', // blue
      '#10b981', // green
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#f97316', // orange
      '#14b8a6', // teal
      '#a855f7', // violet
    ];

    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
  }
}
