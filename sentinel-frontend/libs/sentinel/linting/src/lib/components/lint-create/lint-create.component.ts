import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EMPTY, catchError, interval, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import {
  AnalysisJobsService,
  ApiV1AnalysisJobsGet200ResponseDataInner,
  ApiV1ProjectsGet200ResponseDataProjectsInner,
  ProjectsService,
} from '@sentinel-api';
import { LintResultsComponent } from '../lint-results/lint-results.component';
import { LintStatusComponent } from '../lint-status/lint-status.component';
import { ProjectSelectorComponent } from '@shared/ui-custom';
enum LintStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

interface Lint {
  id: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

@Component({
  selector: 'sen-lint-create',
  imports: [
    CommonModule,
    FormsModule,
    HlmButtonDirective,
    LintResultsComponent,
    LintStatusComponent,
    ProjectSelectorComponent,
  ],
  template: `
    <div class="flex flex-col gap-4 p-6">
      <sen-project-selector
        [projects]="projects()"
        [isLoading]="isLoadingProjects()"
        [disabled]="isJobRunning()"
        [selectedId]="selectedProjectId()"
        (selectionChange)="selectedProjectId.set($event)"
      />

      <div class="flex gap-2">
        <button
          hlmBtn
          (click)="createAnalysis()"
          [disabled]="!canStartAnalysis()"
        >
          @if (!isLoading()) {
            <span>Start New Analysis</span>
          } @else {
            <span>Running...</span>
          }
        </button>
      </div>

      @if (errorMessage()) {
        <div class="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50">
          <p>{{ errorMessage() }}</p>
        </div>
      }
      @if (job()) {
        <sen-lint-status
          [job]="job()"
          [runningTimeSeconds]="runningTimeSeconds()"
        />
      }
      @if (analysisResults()) {
        <sen-lint-results
          [totalExecutionTimeSeconds]="totalExecutionTimeSeconds()"
        />
      }
    </div>
  `,
})
export class LintCreateComponent implements OnInit {
  private analysisService = inject(AnalysisJobsService);
  private projectsService = inject(ProjectsService);
  private destroyRef = inject(DestroyRef);

  // Primary state signals
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  job = signal<Lint | null>(null);
  analysisResults = signal<ApiV1AnalysisJobsGet200ResponseDataInner | null>(
    null,
  );
  projects = signal<ApiV1ProjectsGet200ResponseDataProjectsInner[]>([]);
  selectedProjectId = signal<number | null>(null);
  isLoadingProjects = signal(false);

  // Internal state signals
  private currentJobId = signal<number | null>(null);
  private timerStartTime = signal<number | null>(null);
  private timerStopTime = signal<number | null>(null);
  private isPolling = signal(false);

  // Computed signals
  readonly isJobRunning = computed(() => {
    const job = this.job();
    return job !== null && job.status === LintStatus.RUNNING;
  });

  readonly isJobCompleted = computed(() => {
    const job = this.job();
    return job !== null && job.status === LintStatus.COMPLETED;
  });

  readonly isJobFailed = computed(() => {
    const job = this.job();
    return job !== null && job.status === LintStatus.FAILED;
  });

  readonly shouldFetchResults = computed(() => {
    return (
      this.isJobCompleted() &&
      this.currentJobId() !== null &&
      !this.analysisResults()
    );
  });

  readonly runningTimeSeconds = computed(() => {
    const startTime = this.timerStartTime();
    if (!startTime) return 0;

    // If we have a stop time, use that for the final calculation
    const stopTime = this.timerStopTime();
    if (stopTime) {
      return Math.floor((stopTime - startTime) / 1000);
    }

    // Otherwise return the current running time
    return Math.floor((Date.now() - startTime) / 1000);
  });

  readonly totalExecutionTimeSeconds = computed(() => {
    const startTime = this.timerStartTime();
    const stopTime = this.timerStopTime();

    if (!startTime || !stopTime) return 0;
    return Math.floor((stopTime - startTime) / 1000);
  });

  readonly canStartAnalysis = computed(() => {
    return (
      this.selectedProjectId() !== null &&
      !this.isLoading() &&
      !this.isJobRunning()
    );
  });

  constructor() {
    // Effect to handle job completion
    effect(() => {
      // React to job status completion
      if (this.isJobCompleted() || this.isJobFailed()) {
        this.stopTimer();
        this.isPolling.set(false);
      }

      // Fetch results when needed
      if (this.shouldFetchResults()) {
        const jobId = this.currentJobId();
        if (jobId) {
          this.fetchAnalysisResults(jobId);
        }
      }
    });

    // Effect to handle polling
    effect(() => {
      if (!this.isPolling() || !this.currentJobId()) return;

      // Start polling for job status
      interval(2000)
        .pipe(
          switchMap(() => {
            const jobId = this.currentJobId();
            if (!jobId || !this.isPolling()) return EMPTY;
            return this.analysisService
              .apiV1AnalysisJobsIdGet({ id: jobId })
              .pipe(
                catchError((err) => {
                  this.errorMessage.set(
                    `Failed to check job status: ${
                      err.message || 'Unknown error'
                    }`,
                  );
                  this.isPolling.set(false);
                  return EMPTY;
                }),
              );
          }),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (job) => this.job.set(this.mapToAnalysisJob(job)),
          error: (err) => {
            this.errorMessage.set(
              `Failed to check job status: ${err.message || 'Unknown error'}`,
            );
            this.isPolling.set(false);
          },
        });
    });

    // Effect to update running time - this is still needed for live updates
    effect(() => {
      const startTime = this.timerStartTime();
      const stopTime = this.timerStopTime();

      // If timer is not running, no need for interval
      if (!startTime || stopTime) return;

      // Create interval to force updates to runningTimeSeconds computed signal
      const tickInterval = setInterval(() => {
        // Force re-computation - we don't actually need to set anything
        // since the computed signal uses Date.now()
        this.runningTimeSeconds();
      }, 1000);

      // Clean up interval when timer stops or component destroyed
      return () => clearInterval(tickInterval);
    });
  }

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.isLoadingProjects.set(true);
    this.errorMessage.set(null);

    this.projectsService
      .apiV1ProjectsGet()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.errorMessage.set(
            `Failed to load projects: ${err.message || 'Unknown error'}`,
          );
          this.isLoadingProjects.set(false);
          return of({ data: { projects: [] } });
        }),
      )
      .subscribe({
        next: (response) => {
          this.isLoadingProjects.set(false);
          const projects = response.data.projects || [];
          this.projects.set(projects);

          // Auto-select the first project if available
          if (projects.length > 0 && !this.selectedProjectId()) {
            this.selectedProjectId.set(projects[0].id);
          }
        },
      });
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getObjectEntries(obj: any): [string, any][] {
    return Object.entries(obj || {});
  }

  createAnalysis(): void {
    const projectId = this.selectedProjectId();
    if (!projectId) {
      this.errorMessage.set('Please select a project first');
      return;
    }

    // Reset state
    this.resetState();
    this.selectedProjectId.set(projectId); // Preserve selected project
    this.isLoading.set(true);

    this.analysisService
      .apiV1AnalysisJobsPost({
        apiV1AnalysisJobsPostRequest: {
          project_id: projectId,
        },
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.isLoading.set(false);
          this.errorMessage.set(
            `Failed to start analysis: ${err.message || 'Unknown error'}`,
          );
          console.error('Error starting analysis:', err);
          return EMPTY;
        }),
      )
      .subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.currentJobId.set(response.data.id ?? null);
          this.startTimer();
          this.isPolling.set(true);

          if (response.data) {
            this.fetchInitialJobStatus(response.data.id);
          }
        },
        error: (err: Error) => {
          this.isLoading.set(false);
          this.errorMessage.set(
            `Failed to start analysis: ${err.message || 'Unknown error'}`,
          );
          console.error('Error starting analysis:', err);
        },
      });
  }

  private fetchInitialJobStatus(jobId: number): void {
    this.analysisService
      .apiV1AnalysisJobsIdGet({ id: jobId })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          console.error('Error fetching initial job status:', err);
          return EMPTY;
        }),
      )
      .subscribe((job: any) => {
        this.job.set(this.mapToAnalysisJob(job));
      });
  }

  private resetState(): void {
    this.isLoading.set(false);
    this.errorMessage.set(null);
    this.job.set(null);
    this.analysisResults.set(null);
    this.currentJobId.set(null);
    this.timerStartTime.set(null);
    this.timerStopTime.set(null);
    this.isPolling.set(false);
    // Note: We don't reset selectedProjectId to preserve the selection
  }

  private fetchAnalysisResults(jobId: number): void {
    if (this.analysisResults()) return; // Don't fetch if we already have results

    this.isLoading.set(true);

    this.analysisService
      .apiV1AnalysisJobsIdGet({ id: jobId })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.errorMessage.set(
            `Failed to fetch analysis results: ${
              err.message || 'Unknown error'
            }`,
          );
          this.isLoading.set(false);
          return EMPTY;
        }),
      )
      .subscribe({
        next: (results: any) => {
          this.analysisResults.set(results);
          this.isLoading.set(false);
        },
      });
  }

  private startTimer(): void {
    this.timerStartTime.set(Date.now());
    this.timerStopTime.set(null);
  }

  private stopTimer(): void {
    if (this.timerStartTime()) {
      this.timerStopTime.set(Date.now());
    }
  }

  // Helper to map API response to our model
  private mapToAnalysisJob(apiJob: any): Lint | null {
    if (!apiJob.data) {
      return null;
    }
    return {
      id: apiJob.data.id,
      status: apiJob.data.status,
      created_at: apiJob.data.created_at,
      completed_at: apiJob.data.completed_at,
    };
  }

  private getProcessingStatusFromJobStatus(status: LintStatus): string {
    switch (status) {
      case LintStatus.PENDING:
        return 'Waiting to start';
      case LintStatus.RUNNING:
        return 'Processing in progress';
      case LintStatus.COMPLETED:
        return 'Completed';
      case LintStatus.FAILED:
        return 'Failed';
      default:
        return 'Unknown';
    }
  }
}
