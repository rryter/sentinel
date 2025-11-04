import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';

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
        <div class="text-gray-900">{{ job()?.id }}</div>

        <div class="text-gray-500">Status:</div>
        <div class="text-gray-900">
          <span [class]="statusClass()">
            {{ statusText() }}
            @if (isRunning()) {
              ({{ formattedTime() }})
            }
          </span>
        </div>

        <div class="text-gray-500">Started:</div>
        <div class="text-gray-900">
          {{ job()?.created_at | date: 'medium' }}
        </div>

        @if (job()?.completed_at) {
          <div class="text-gray-500">Completed:</div>
          <div class="text-gray-900">
            {{ job()?.completed_at | date: 'medium' }}
          </div>
        }
      </div>
    </div>
  `,
})
export class LintStatusComponent {
  job = input<AnalysisJob | null>(null);
  runningTimeSeconds = input<number>(0);

  readonly isRunning = computed(
    () => this.job()?.status === AnalysisJobStatus.RUNNING,
  );

  readonly statusClass = computed(() => {
    const status = this.job()?.status;
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
  });

  readonly statusText = computed(() => {
    const status = this.job()?.status;
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
  });

  readonly formattedTime = computed(() => {
    const seconds = this.runningTimeSeconds();
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  });
}
