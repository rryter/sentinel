import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ApiV1AnalysisJobsGet200ResponseDataInner } from '@sentinel/api';
import {
  CategoryScale,
  Chart,
  ChartConfiguration,
  ChartOptions,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  TooltipItem, // Added TooltipItem for typing
} from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

// Register the required components for Chart.js
Chart.register(
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
);

@Component({
  selector: 'sen-performance-metrics',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './performance-metrics.component.html',
})
export class PerformanceMetricsComponent implements OnChanges {
  @Input() analysisRuns: ApiV1AnalysisJobsGet200ResponseDataInner[] = [];

  chartData: ChartConfiguration<'line'>['data'] = {
    // Reverted to <'line'>
    labels: [],
    datasets: [
      {
        label: 'Files Per Second',
        // type: 'line', // Not needed if chart type is line and this is default
        data: [],
        borderColor: 'rgb(75, 192, 192)', // Teal
        tension: 0.1,
        yAxisID: 'filesPerSecond',
      },
      {
        label: 'Parallel Efficiency (%)',
        // type: 'line',
        data: [],
        borderColor: 'rgb(255, 99, 132)', // Red
        tension: 0.1,
        yAxisID: 'efficiency',
        borderDash: [5, 5],
      },
      // Removed Number of Cores dataset
    ],
  };

  chartOptions: ChartOptions<'line'> = {
    // Reverted to <'line'>
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'category',
        title: {
          display: true,
          text: 'Analysis Run',
        },
        ticks: {
          maxRotation: 70,
          minRotation: 70,
          autoSkip: true,
          maxTicksLimit: 10,
        },
      },
      filesPerSecond: {
        type: 'linear',
        position: 'left',
        title: {
          display: true,
          text: 'Files Per Second',
        },
        min: 0,
      },
      efficiency: {
        type: 'linear',
        position: 'right',
        title: {
          display: true,
          text: 'Parallel Efficiency (%)',
        },
        min: 0,
        max: 100, // Efficiency is a percentage
        grid: {
          drawOnChartArea: false,
        },
      },
      // Removed cores Y-axis
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            // Typed context to <'line'>
            const datasetLabel = context.dataset.label || '';
            const value = context.parsed.y;
            if (datasetLabel.includes('Efficiency')) {
              return `${datasetLabel}: ${value.toFixed(0)}%`;
            }
            // Removed Cores condition
            return `${datasetLabel}: ${value.toFixed(0)}`;
          },
        },
      },
      title: {
        display: true,
        text: 'Performance Metrics Over Time',
      },
    },
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['analysisRuns']) {
      this.updateChartData();
    }
  }

  private updateChartData(): void {
    if (!this.analysisRuns || this.analysisRuns.length === 0) {
      this.chartData = {
        labels: [],
        datasets: [
          { ...this.chartData.datasets[0], data: [] },
          { ...this.chartData.datasets[1], data: [] },
          // Removed placeholder for the third dataset
        ],
      };
      return;
    }

    const sortedRuns = [...this.analysisRuns].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const labels = sortedRuns.map((run) => {
      const date = new Date(run.created_at);
      const formattedDate = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return `${formattedDate}`;
    });

    const filesPerSecondData = sortedRuns.map(
      (run) => run.files_per_second_wall_time,
    );
    const efficiencyData = sortedRuns.map(
      (run) => run.parallel_efficiency_percent,
    );
    // Removed coresData extraction

    this.chartData = {
      labels,
      datasets: [
        {
          ...this.chartData.datasets[0],
          data: filesPerSecondData,
        },
        {
          ...this.chartData.datasets[1],
          data: efficiencyData,
        },
        // Removed third dataset update
      ],
    };
  }
}
