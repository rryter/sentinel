import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';

Chart.register(...registerables);

interface RuleViolation {
  rule_name: string;
  violations_count: number;
}

interface JobHistoryData {
  job_id: number;
  created_at: string;
  completed_at: string;
  total_files: number;
  total_violations: number;
  rules: RuleViolation[];
}

interface ApiResponse {
  data: JobHistoryData[];
  meta: {
    project_id: string;
    total_jobs: number;
  };
}

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

  private chart: Chart | null = null;

  readonly apiData = signal<ApiResponse | null>(null);
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
    // Initialize chart after view is ready
    setTimeout(() => this.updateChart(), 100);
  }

  loadData() {
    // Simulated API data based on the provided structure
    const mockData: ApiResponse = {
      data: [
        {
          job_id: 3,
          created_at: '2025-05-06T17:14:27.642Z',
          completed_at: '2025-05-06T17:14:30.036Z',
          total_files: 1384,
          total_violations: 1474,
          rules: [
            {
              rule_name: 'angular-obsolete-standalone-true',
              violations_count: 334,
            },
            { rule_name: 'angular-legacy-decorators', violations_count: 179 },
            { rule_name: 'angular-input-count', violations_count: 10 },
          ],
        },
        {
          job_id: 4,
          created_at: '2025-05-06T17:15:25.737Z',
          completed_at: '2025-05-06T17:15:27.724Z',
          total_files: 1384,
          total_violations: 1474,
          rules: [
            {
              rule_name: 'angular-obsolete-standalone-true',
              violations_count: 334,
            },
            { rule_name: 'angular-legacy-decorators', violations_count: 179 },
            { rule_name: 'angular-input-count', violations_count: 10 },
          ],
        },
        {
          job_id: 5,
          created_at: '2025-05-06T18:51:52.491Z',
          completed_at: '2025-05-06T18:51:54.329Z',
          total_files: 1384,
          total_violations: 1474,
          rules: [
            {
              rule_name: 'angular-obsolete-standalone-true',
              violations_count: 334,
            },
            { rule_name: 'angular-legacy-decorators', violations_count: 179 },
            { rule_name: 'angular-input-count', violations_count: 10 },
          ],
        },
        {
          job_id: 6,
          created_at: '2025-05-06T18:54:26.280Z',
          completed_at: '2025-05-06T18:54:28.076Z',
          total_files: 1384,
          total_violations: 1474,
          rules: [
            {
              rule_name: 'angular-obsolete-standalone-true',
              violations_count: 334,
            },
            { rule_name: 'angular-legacy-decorators', violations_count: 179 },
            { rule_name: 'angular-input-count', violations_count: 10 },
          ],
        },
        {
          job_id: 7,
          created_at: '2025-10-29T06:10:51.377Z',
          completed_at: '2025-10-29T06:11:15.717Z',
          total_files: 385,
          total_violations: 79,
          rules: [{ rule_name: 'parser', violations_count: 79 }],
        },
        {
          job_id: 8,
          created_at: '2025-10-29T19:37:01.283Z',
          completed_at: '2025-10-29T19:37:06.252Z',
          total_files: 3002,
          total_violations: 6771,
          rules: [
            { rule_name: 'angular-legacy-decorators', violations_count: 2370 },
            {
              rule_name: 'angular-obsolete-standalone-true',
              violations_count: 566,
            },
            { rule_name: 'typescript-type-assertion', violations_count: 3184 },
            {
              rule_name: 'angular-component-class-suffix',
              violations_count: 1,
            },
            { rule_name: 'angular-input-count', violations_count: 58 },
            {
              rule_name: 'angular-directive-class-suffix',
              violations_count: 1,
            },
            {
              rule_name: 'typescript-non-null-assertion',
              violations_count: 90,
            },
          ],
        },
      ],
      meta: {
        project_id: '2',
        total_jobs: 6,
      },
    };

    this.apiData.set(mockData);
    this.processRulesFromData(mockData);
  }

  processRulesFromData(data: ApiResponse) {
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
