import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BuildMetricsChartComponent } from '../../components/build-metrics-chart/build-metrics-chart.component';
import { BuildMetricsResponse } from '../../interfaces/build-metrics.interface';
import { environment } from 'apps/sentinel/src/environments/environment';

@Component({
  selector: 'sentinel-build-metrics',
  standalone: true,
  imports: [CommonModule, BuildMetricsChartComponent],
  template: `
    <div class="p-4">
      <h1 class="text-2xl font-bold mb-4">Build Metrics</h1>
      <sentinel-build-metrics-chart
        [metrics]="metrics"
      ></sentinel-build-metrics-chart>
    </div>
  `,
  styles: [``],
})
export class BuildMetricsComponent implements OnInit {
  metrics: BuildMetricsResponse['metrics'] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchMetrics();
  }

  private fetchMetrics() {
    this.http
      .get<BuildMetricsResponse>(
        `http://localhost:3000/api/v1/build_metrics?interval=5m`,
      )
      .subscribe({
        next: (response) => {
          this.metrics = response.metrics;
        },
        error: (error) => {
          console.error('Error fetching build metrics:', error);
        },
      });
  }
}
