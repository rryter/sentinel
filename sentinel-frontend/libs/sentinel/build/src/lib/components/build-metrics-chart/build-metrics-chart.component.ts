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
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="w-full h-[400px]">
      <canvas
        baseChart
        [data]="chartData"
        [options]="chartOptions"
        [type]="'line'"
      >
      </canvas>
    </div>
  `,
  styles: [``],
})
export class BuildMetricsChartComponent implements OnChanges {
  @Input() metrics: BuildMetric[] = [];

  chartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Initial Build Duration (avg)',
        data: [],
        borderColor: 'rgb(59, 130, 246)',
        tension: 0.1,
      },
      {
        label: 'Hot Reload Duration (avg)',
        data: [],
        borderColor: 'rgb(234, 88, 12)',
        tension: 0.1,
      },
      {
        label: 'Memory Usage %',
        data: [],
        borderColor: 'rgb(22, 163, 74)',
        tension: 0.1,
        yAxisID: 'memory',
      },
    ],
  };

  chartOptions: ChartOptions = {
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
      y: {
        title: {
          display: true,
          text: 'Duration (seconds)',
        },
        min: 0,
      },
      memory: {
        position: 'right',
        title: {
          display: true,
          text: 'Memory Usage %',
        },
        min: 0,
        max: 100,
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const datasetLabel = context.dataset.label || '';
            const value = context.parsed.y;
            if (datasetLabel.includes('Memory')) {
              return `${datasetLabel}: ${value}%`;
            }
            return `${datasetLabel}: ${value.toFixed(2)}s`;
          },
        },
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
    const initialBuildData = this.metrics.map((m) =>
      m.initial_builds.avg_duration_sec
        ? parseFloat(m.initial_builds.avg_duration_sec)
        : null,
    );
    const hotReloadData = this.metrics.map((m) =>
      m.hot_reloads.avg_duration_sec
        ? parseFloat(m.hot_reloads.avg_duration_sec)
        : null,
    );
    const memoryData = this.metrics.map((m) =>
      parseFloat(m.system.memory_usage_percent),
    );

    this.chartData = {
      labels,
      datasets: [
        {
          ...this.chartData.datasets[0],
          data: initialBuildData,
        },
        {
          ...this.chartData.datasets[1],
          data: hotReloadData,
        },
        {
          ...this.chartData.datasets[2],
          data: memoryData,
        },
      ],
    };
  }
}
