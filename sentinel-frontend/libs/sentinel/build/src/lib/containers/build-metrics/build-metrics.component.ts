import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BuildMetricsChartComponent } from '../../components/build-metrics-chart/build-metrics-chart.component';
import { BuildMetricsResponse } from '../../interfaces/build-metrics.interface';
import { BehaviorSubject, map, Observable, switchMap } from 'rxjs';
import { BuildMetricsSelectorComponent } from '@shared/ui-custom';
import { provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectImports } from '@spartan-ng/ui-select-helm';
import { FormsModule } from '@angular/forms';

const AVAILABLE_INTERVALS = [
  '1m',
  '5m',
  '15m',
  '30m',
  '1h',
  '6h',
  '12h',
  '1d',
] as const;
type Interval = (typeof AVAILABLE_INTERVALS)[number];

@Component({
  selector: 'sentinel-build-metrics',
  imports: [
    CommonModule,
    FormsModule,
    BuildMetricsChartComponent,
    BuildMetricsSelectorComponent,
    BrnSelectImports,
    HlmSelectImports,
  ],
  providers: [provideIcons({ lucideChevronDown })],
  template: `
    <div class="p-4">
      <h1 class="text-2xl font-bold mb-4">Build Metrics</h1>
      <div class="mb-4">
        <sen-build-metrics-selector
          [options]="intervalOptions"
          [selectedValue]="selectedInterval"
          (valueChange)="onIntervalChange($event)"
          label="Select Interval"
          placeholder="Choose an interval"
        ></sen-build-metrics-selector>
      </div>
      @if (metrics$ | async; as metrics) {
        <sentinel-build-metrics-chart
          [metrics]="metrics"
        ></sentinel-build-metrics-chart>
      } @else {
        <div class="text-center text-gray-500">Loading...</div>
      }
    </div>
  `,
  styles: [``],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuildMetricsComponent implements OnInit {
  metrics$: Observable<BuildMetricsResponse['metrics']> | undefined;
  intervalOptions: any[] = AVAILABLE_INTERVALS.map((interval) => ({
    id: interval,
    value: interval,
    label: this.formatIntervalLabel(interval),
  }));
  selectedInterval: Interval = '1h';
  interval$ = new BehaviorSubject<Interval>(this.selectedInterval);
  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.metrics$ = this.interval$.pipe(
      switchMap((interval: Interval) => this.fetchMetrics(interval)),
    );
  }

  private fetchMetrics(interval: Interval) {
    console.log('fetching metrics for interval', interval);
    return this.http
      .get<BuildMetricsResponse>(
        `http://localhost:3000/api/v1/build_metrics?interval=${interval}`,
      )
      .pipe(map((response) => response.metrics));
  }

  private formatIntervalLabel(interval: string): string {
    const value = interval.slice(0, -1);
    const unit = interval.slice(-1);
    const units = {
      h: value === '1' ? 'Hour' : 'Hours',
      m: value === '1' ? 'Minute' : 'Minutes',
      d: value === '1' ? 'Day' : 'Days',
    };
    return `${value} ${units[unit as keyof typeof units] || unit}`;
  }

  onIntervalChange(value: any) {
    console.log('onIntervalChange', value);
    if (this.isValidInterval(value)) {
      this.interval$.next(value);
    }
  }

  private isValidInterval(value: string): value is Interval {
    return AVAILABLE_INTERVALS.includes(value as Interval);
  }
}
