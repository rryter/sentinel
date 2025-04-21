import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';
import { Chart } from 'chart.js';
import {
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  LineController,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { BuildMetric } from '../../interfaces/build-metrics.interface';

// Register the required components
Chart.register(
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
);

@Component({
  selector: 'sentinel-build-metrics-chart',
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="space-y-8">
      <!-- Initial Builds Chart -->
      <div>
        <h2 class="text-xl font-semibold mb-4">Initial Builds</h2>
        <div class="w-full h-[400px]">
          <canvas
            baseChart
            [data]="initialBuildChartData"
            [options]="initialBuildChartOptions"
            [type]="'line'"
          >
          </canvas>
        </div>
      </div>

      <!-- Hot Reloads Chart -->
      <div>
        <h2 class="text-xl font-semibold mb-4">Hot Reloads</h2>
        <div class="w-full h-[400px]">
          <canvas
            baseChart
            [data]="hotReloadChartData"
            [options]="hotReloadChartOptions"
            [type]="'line'"
          >
          </canvas>
        </div>
      </div>
    </div>
  `,
  styles: [``],
})
export class BuildMetricsChartComponent implements OnChanges {
  @Input() metrics: BuildMetric[] = [];

  private baseChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'minute',
          displayFormats: {
            minute: 'HH:mm',
          },
        },
        title: {
          display: true,
          text: 'Time',
        },
      },
      duration: {
        type: 'linear',
        position: 'left',
        title: {
          display: true,
          text: 'Duration (seconds)',
        },
        min: 0,
      },
      files: {
        type: 'linear',
        position: 'right',
        title: {
          display: true,
          text: 'Files Count',
        },
        min: 0,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const datasetLabel = context.dataset.label || '';
            const value = context.parsed.y;
            if (datasetLabel.includes('Files')) {
              return `${datasetLabel}: ${value.toFixed(0)}`;
            }
            return `${datasetLabel}: ${value.toFixed(2)}s`;
          },
        },
      },
    },
  };

  initialBuildChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Build Duration',
        data: [],
        borderColor: 'rgb(59, 130, 246)', // blue
        tension: 0.1,
        yAxisID: 'duration',
      },
      {
        label: 'Files Count',
        data: [],
        borderColor: 'rgb(147, 51, 234)', // purple
        tension: 0.1,
        yAxisID: 'files',
        borderDash: [5, 5],
      },
    ],
  };

  hotReloadChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Build Duration',
        data: [],
        borderColor: 'rgb(234, 88, 12)', // orange
        tension: 0.1,
        yAxisID: 'duration',
      },
      {
        label: 'Files Count',
        data: [],
        borderColor: 'rgb(236, 72, 153)', // pink
        tension: 0.1,
        yAxisID: 'files',
        borderDash: [5, 5],
      },
    ],
  };

  initialBuildChartOptions: ChartOptions = {
    ...this.baseChartOptions,
    plugins: {
      ...this.baseChartOptions.plugins,
      title: {
        display: true,
      },
    },
  };

  hotReloadChartOptions: ChartOptions = {
    ...this.baseChartOptions,
    plugins: {
      ...this.baseChartOptions.plugins,
      title: {
        display: false,
      },
    },
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['metrics']) {
      this.updateChartData();
    }
  }

  private updateChartData(): void {
    const labels = this.metrics.map((m) => new Date(m.timestamp));

    // Initial Build Data
    const initialBuildDuration = this.metrics.map((m) =>
      m.initial_builds.avg_duration_sec
        ? parseFloat(m.initial_builds.avg_duration_sec)
        : null,
    );
    const initialBuildFiles = this.metrics.map(
      (m) => m.initial_builds.avg_files_count,
    );

    // Hot Reload Data
    const hotReloadDuration = this.metrics.map((m) =>
      m.hot_reloads.avg_duration_sec
        ? parseFloat(m.hot_reloads.avg_duration_sec)
        : null,
    );
    const hotReloadFiles = this.metrics.map(
      (m) => m.hot_reloads.avg_files_count,
    );

    // Update Initial Build Chart
    this.initialBuildChartData = {
      labels,
      datasets: [
        {
          ...this.initialBuildChartData.datasets[0],
          data: initialBuildDuration,
        },
        {
          ...this.initialBuildChartData.datasets[1],
          data: initialBuildFiles,
        },
      ],
    };

    // Update Hot Reload Chart
    this.hotReloadChartData = {
      labels,
      datasets: [
        {
          ...this.hotReloadChartData.datasets[0],
          data: hotReloadDuration,
        },
        {
          ...this.hotReloadChartData.datasets[1],
          data: hotReloadFiles,
        },
      ],
    };
  }
}
