import { Component, Input, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

interface AnalysisJob {
  id: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

enum AnalysisJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Component({
  selector: 'sen-lint-status',
  imports: [CommonModule],
  providers: [DatePipe],
  template: `
    <div class="mb-4 rounded-md bg-gray-50 p-4">
      <h3 class="text-lg font-medium text-gray-900">Job Status</h3>
      <div class="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div class="text-gray-500">ID:</div>
        <div class="text-gray-900">{{ job?.id }}</div>

        <div class="text-gray-500">Status:</div>
        <div class="text-gray-900">
          <span [class]="getStatusClass(job?.status)">
            {{ getStatusText(job?.status) }}
            @if (isRunning()) {
              ({{ formatTime(runningTimeSeconds) }})
            }
          </span>
        </div>

        <div class="text-gray-500">Started:</div>
        <div class="text-gray-900">{{ job?.created_at | date: 'medium' }}</div>

        @if (job?.completed_at) {
          <div class="text-gray-500">Completed:</div>
          <div class="text-gray-900">
            {{ job?.completed_at | date: 'medium' }}
          </div>
        }
      </div>
    </div>
  `,
})
export class LintStatusComponent {
  @Input() job: AnalysisJob | null = null;
  @Input() runningTimeSeconds = 0;

  readonly isRunning = computed(
    () => this.job?.status === AnalysisJobStatus.RUNNING,
  );

  getStatusClass(status: string | undefined): string {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'text-green-600';
      case 'running':
        return 'text-blue-600';
      case 'failed':
        return 'text-red-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  }

  getStatusText(status: string | undefined): string {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'Completed';
      case 'running':
        return 'Running';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
