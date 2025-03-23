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
import { AnalysisService, AnalysisJob } from '../../services/analysis.service';
import { ProjectsService } from '../../../projects/services/projects.service';
import { EMPTY, catchError, interval, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AnalysisResults } from '../model/analysis/analysis.model';

interface Project {
  id: string;
  name: string;
}

@Component({
  selector: 'app-create-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-analysis.component.html',
  styleUrl: './create-analysis.component.scss',
})
export class CreateAnalysisComponent implements OnInit {
  private analysisService = inject(AnalysisService);
  private projectsService = inject(ProjectsService);
  private destroyRef = inject(DestroyRef);

  // Primary state signals
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  job = signal<AnalysisJob | null>(null);
  analysisResults = signal<AnalysisResults | null>(null);
  projects = signal<Project[]>([]);
  selectedProjectId = signal<string | null>(null);
  isLoadingProjects = signal(false);

  // Internal state signals
  private currentJobId = signal<string | null>(null);
  private timerStartTime = signal<number | null>(null);
  private timerStopTime = signal<number | null>(null);
  private isPolling = signal(false);

  // Computed signals
  readonly isJobRunning = computed(() => {
    const job = this.job();
    return job !== null && job.status === 'running';
  });

  readonly isJobCompleted = computed(() => {
    const job = this.job();
    return job !== null && job.status === 'completed';
  });

  readonly isJobFailed = computed(() => {
    const job = this.job();
    return job !== null && job.status === 'failed';
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
        this.fetchAnalysisResults(this.currentJobId()!);
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
            return this.analysisService.getJobStatus(jobId).pipe(
              catchError((err) => {
                this.errorMessage.set(
                  `Failed to check job status: ${
                    err.message || 'Unknown error'
                  }`
                );
                this.isPolling.set(false);
                return EMPTY;
              })
            );
          }),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: (job) => this.job.set(job),
          error: (err) => {
            this.errorMessage.set(
              `Failed to check job status: ${err.message || 'Unknown error'}`
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
      .getProjects()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.errorMessage.set(
            `Failed to load projects: ${err.message || 'Unknown error'}`
          );
          this.isLoadingProjects.set(false);
          return of([]);
        })
      )
      .subscribe({
        next: (projects) => {
          this.projects.set(projects);
          this.isLoadingProjects.set(false);

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

  // Helper methods for the template
  getObjectKeys(obj: any): string[] {
    return Object.keys(obj || {});
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
      .startAnalysis(projectId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.isLoading.set(false);
          this.errorMessage.set(
            `Failed to start analysis: ${err.message || 'Unknown error'}`
          );
          console.error('Error starting analysis:', err);
          return EMPTY;
        })
      )
      .subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.currentJobId.set(response.jobId);
          this.startTimer();
          this.isPolling.set(true);

          // Immediately fetch initial job status
          this.fetchInitialJobStatus(response.jobId);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(
            `Failed to start analysis: ${err.message || 'Unknown error'}`
          );
          console.error('Error starting analysis:', err);
        },
      });
  }

  private fetchInitialJobStatus(jobId: string): void {
    this.analysisService
      .getJobStatus(jobId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          console.error('Error fetching initial job status:', err);
          return EMPTY;
        })
      )
      .subscribe((job) => {
        this.job.set(job);
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

  private fetchAnalysisResults(jobId: string): void {
    if (this.analysisResults()) return; // Don't fetch if we already have results

    this.isLoading.set(true);

    this.analysisService
      .getAnalysisResults(jobId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.errorMessage.set(
            `Failed to fetch analysis results: ${
              err.message || 'Unknown error'
            }`
          );
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe({
        next: (results) => {
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
}
