import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import {
  CategoryScale,
  Chart,
  ChartConfiguration,
  ChartOptions,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement, // Ensure CategoryScale is imported
  TimeScale,
  Title,
  Tooltip,
} from 'chart.js';
import 'chartjs-adapter-date-fns'; // Keep for date formatting utilities
import { BaseChartDirective } from 'ng2-charts';

// Register the required components
Chart.register(
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  CategoryScale, // Ensure CategoryScale is registered
  TimeScale, // Keep TimeScale registered for date adapter functionalities
);

export interface AnalysisRun {
  id: number;
  project_id: number;
  status: string;
  created_at: string;
  updated_at: string;
  duration: number;
  total_files: number;
  total_matches: number;
  rules_matched: number;
  files_per_second_wall_time: number;
  files_per_second_cpu_time: number;
  avg_time_per_file_ms: number;
  cumulative_processing_time_ms: number;
  parallel_cores_used: number;
  parallel_speedup_factor: number;
  parallel_efficiency_percent: number;
  project: {
    id: number;
    name: string;
    repository_url: string;
    created_at: string;
    updated_at: string;
  };
}

@Component({
  selector: 'sen-analysis-run-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="h-[400px]">
      <canvas
        baseChart
        [data]="chartData"
        [options]="chartOptions"
        [type]="'line'"
      >
      </canvas>
    </div>
  `,
})
export class AnalysisRunChartComponent implements OnChanges {
  @Input() analysisRuns: AnalysisRun[] = [];

  chartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Duration (ms)', // Changed from 'Duration (seconds)'
        data: [],
        borderColor: 'rgb(59, 130, 246)', // blue
        tension: 0.1,
        yAxisID: 'duration',
      },
      {
        label: 'Total Files',
        data: [],
        borderColor: 'rgb(147, 51, 234)', // purple
        tension: 0.1,
        yAxisID: 'files',
        borderDash: [5, 5],
      },
      {
        label: 'Files Per Second', // New dataset
        data: [],
        borderColor: 'rgb(34, 197, 94)', // green
        tension: 0.1,
        yAxisID: 'filesPerSecond',
        borderDash: [2, 2],
      },
    ],
  };

  chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'category', // Changed to category
        // Removed time configuration block
        title: {
          display: false,
        },
        ticks: {
          maxRotation: 70, // Rotate labels to prevent overlap if they are long
          minRotation: 70,
          autoSkip: true, // Allow Chart.js to skip labels if too many
          maxTicksLimit: 10, // Limit the number of visible ticks if necessary
        },
      },
      duration: {
        type: 'linear',
        position: 'left',
        title: {
          display: true,
          text: 'Duration (ms)',
        },
      },
      files: {
        type: 'linear',
        position: 'right',
        title: {
          display: true,
          text: 'Total Files',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      filesPerSecond: {
        // New Y-axis
        type: 'linear',
        position: 'right', // Or 'left' if preferred, adjust as needed
        title: {
          display: true,
          text: 'Files Per Second',
        },
        grid: {
          drawOnChartArea: false, // To avoid clutter, only one Y-axis grid is usually shown
        },
        // Offset this axis to avoid overlapping with the 'files' axis label if both are on the right
        // This might require CSS or more advanced chart.js config if direct options aren't enough
        // For now, we'll assume it's acceptable or will be manually adjusted if overlapping.
        // A common approach is to place one on the left and others on the right.
        // If 'files' is on the right, consider placing this on the left or ensuring titles don't overlap.
        // For simplicity, placing it on the right and assuming manual checks for overlap.
        // If 'files' axis is also on the right, you might need to adjust its title or this one's.
        // Consider placing one axis on the left and the other two on the right, or vice-versa.
        // Let's try putting 'duration' on left, 'files' on right, and 'filesPerSecond' also on the right but further out or with offset.
        // For now, let's keep 'files' on the right and add 'filesPerSecond' also on the right.
        // We might need to adjust the `offset` property if available or use padding in title.
        // Chart.js might automatically handle some spacing, but it can get crowded.
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const datasetLabel = context.dataset.label || '';
            const value = context.parsed.y;
            if (datasetLabel.includes('Files/s')) {
              return `${datasetLabel}: ${value.toFixed(0)}`;
            }
            if (datasetLabel.includes('Files')) {
              return `${datasetLabel}: ${value.toFixed(0)}`;
            }
            // Assuming the other dataset is Duration
            return `${datasetLabel}: ${value.toFixed(0)}ms`; // Changed to toFixed(0) and 'ms'
          },
        },
      },
      title: {
        display: true,
        text: 'Analysis Runs Over Time',
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
          { ...this.chartData.datasets[2], data: [] }, // Added for files_per_second_wall_time
        ],
      };
      return;
    }

    const sortedRuns = [...this.analysisRuns].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const labels = sortedRuns.map((run, index) => {
      const date = new Date(run.created_at);
      // Format date as 'MMM d, HH:mm' e.g., 'May 7, 19:40'
      const formattedDate = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return `Run ${index + 1} (${formattedDate})`;
    });
    const durationData = sortedRuns.map((run) => run.duration);
    const filesData = sortedRuns.map((run) => run.total_files);
    const filesPerSecondData = sortedRuns.map(
      (run) => run.files_per_second_wall_time,
    ); // New data extraction

    this.chartData = {
      labels,
      datasets: [
        {
          ...this.chartData.datasets[0],
          data: durationData,
        },
        {
          ...this.chartData.datasets[1],
          data: filesData,
        },
        {
          ...this.chartData.datasets[2], // Added for files_per_second_wall_time
          data: filesPerSecondData,
        },
      ],
    };
  }
}
