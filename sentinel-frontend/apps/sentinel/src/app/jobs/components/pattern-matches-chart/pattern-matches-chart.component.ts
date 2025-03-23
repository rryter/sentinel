import {
  Component,
  Input,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisService } from '../../services/analysis.service';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

interface TimeSeriesDataPoint {
  date: string;
  count: number;
}

@Component({
  selector: 'app-pattern-matches-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pattern-matches-chart.component.html',
  styleUrl: './pattern-matches-chart.component.scss',
})
export class PatternMatchesChartComponent
  implements OnInit, AfterViewInit, OnChanges
{
  @Input() jobId?: string;
  @Input() startDate?: string;
  @Input() endDate?: string;
  @Input() ruleId?: string;
  @Input() ruleName?: string;

  @ViewChild('chartCanvas') chartCanvas?: ElementRef<HTMLCanvasElement>;

  isLoading = true;
  error: string | null = null;
  chartData$: Observable<TimeSeriesDataPoint[]> | null = null;
  private chart?: Chart;

  constructor(private analysisService: AnalysisService) {}

  ngOnInit(): void {
    this.loadChartData();
  }

  ngAfterViewInit(): void {
    // If we already have data, initialize the chart
    if (this.chartData$) {
      this.chartData$.subscribe((data) => {
        if (data && data.length > 0) {
          this.initializeChart(data);
        }
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Reload data if any inputs change
    if (
      changes['jobId'] ||
      changes['startDate'] ||
      changes['endDate'] ||
      changes['ruleId'] ||
      changes['ruleName']
    ) {
      this.loadChartData();
    }
  }

  private loadChartData(): void {
    this.isLoading = true;

    this.chartData$ = this.analysisService
      .getPatternMatchesTimeSeries({
        job_id: this.jobId,
        start_date: this.startDate,
        end_date: this.endDate,
        rule_id: this.ruleId,
        rule_name: this.ruleName,
      })
      .pipe(
        tap((data) => {
          this.isLoading = false;
          // Initialize or update chart after data loads
          setTimeout(() => this.initializeChart(data), 0);
        }),
        catchError((error) => {
          console.error('Error loading time series data:', error);
          this.error = 'Failed to load pattern matches data';
          this.isLoading = false;
          return of([]);
        })
      );
  }

  private initializeChart(data: TimeSeriesDataPoint[]): void {
    if (!this.chartCanvas || data.length === 0) return;

    // Destroy existing chart if it exists
    if (this.chart) {
      this.chart.destroy();
    }

    const labels = data.map((item) => this.formatDate(item.date));
    const counts = data.map((item) => item.count);

    const chartConfig: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Pattern Matches',
            data: counts,
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointBackgroundColor: '#4f46e5',
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Date',
            },
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Matches',
            },
            ticks: {
              precision: 0, // Only show integer values
            },
          },
        },
      },
    };

    this.chart = new Chart(this.chartCanvas.nativeElement, chartConfig);
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}
