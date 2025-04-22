import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BuildMetricsChartComponent } from '../../components/build-metrics-chart/build-metrics-chart.component';
import { BuildMetricsResponse } from '../../interfaces/build-metrics.interface';
import { map, Observable } from 'rxjs';
@Component({
  selector: 'sentinel-build-metrics',
  imports: [CommonModule, BuildMetricsChartComponent],
  template: `
    <div class="p-4">
      <h1 class="text-2xl font-bold mb-4">Build Metrics</h1>
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
})
export class BuildMetricsComponent {
  metrics$: Observable<BuildMetricsResponse['metrics']>;

  constructor(private http: HttpClient) {
    this.metrics$ = this.fetchMetrics();
  }

  private fetchMetrics() {
    return this.http
      .get<BuildMetricsResponse>(
        `http://localhost:3000/api/v1/build_metrics?interval=12h`,
      )
      .pipe(map((response) => response.metrics));
  }
}
