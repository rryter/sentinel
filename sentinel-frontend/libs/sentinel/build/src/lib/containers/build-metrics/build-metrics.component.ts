import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import { PageHeaderComponent } from '@sentinel/layouts';
import {
  BuildMetricsSelectorComponent,
  RoutingService,
} from '@shared/ui-custom';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { BehaviorSubject, map, Observable, switchMap } from 'rxjs';
import {
  ApiV1ProjectsProjectIdBuildMetricsGet200ResponseMetricsInner,
  BuildMetricsService,
} from '../../../../../../../libs/shared/api';
import { BuildMetricsChartComponent } from '../../components/build-metrics-chart/build-metrics-chart.component';

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
    PageHeaderComponent,
  ],
  providers: [provideIcons({ lucideChevronDown })],
  template: `<lib-page-header
      [title]="'Build Metrics'"
      [description]="
        'Real-time build analytics and performance benchmarks for your codebase'
      "
      [breadcrumbs]="[
        { label: 'Projects', route: '/projects' },
        { label: 'asd', route: '/projects/' + projectId() },
      ]"
    >
      <sen-build-metrics-selector
        [options]="intervalOptions"
        [selectedValue]="selectedInterval"
        (valueChange)="onIntervalChange($event)"
        label="Select Interval"
        placeholder="Choose an interval"
      ></sen-build-metrics-selector
    ></lib-page-header>
    <div class="p-8">
      @if (metrics$ | async; as metrics) {
        <sentinel-build-metrics-chart
          [metrics]="metrics"
        ></sentinel-build-metrics-chart>
      } @else {
        <div class="text-center text-gray-500">Loading...</div>
      }
    </div> `,
  styles: [``],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuildMetricsComponent implements OnInit {
  projectId = input();
  metrics$:
    | Observable<ApiV1ProjectsProjectIdBuildMetricsGet200ResponseMetricsInner[]>
    | undefined;
  intervalOptions: any[] = AVAILABLE_INTERVALS.map((interval) => ({
    id: interval,
    value: interval,
    label: this.formatIntervalLabel(interval),
  }));
  selectedInterval: Interval = '1h';
  interval$ = new BehaviorSubject<Interval>(this.selectedInterval);

  private readonly buildMetricsService = inject(BuildMetricsService);
  private readonly routingService = inject(RoutingService);

  ngOnInit() {
    this.metrics$ = this.interval$.pipe(
      switchMap((interval: Interval) => this.fetchMetrics(interval)),
    );
  }

  private fetchMetrics(interval: Interval) {
    console.log('fetching metrics for interval', interval);
    const projectId = this.routingService.projectId;
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    return this.buildMetricsService
      .apiV1ProjectsProjectIdBuildMetricsGet({
        projectId: projectId,
        interval: interval,
      })
      .pipe(map((response) => response.metrics || []));
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
