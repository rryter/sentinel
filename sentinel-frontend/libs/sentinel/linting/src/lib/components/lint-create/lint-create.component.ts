import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EMPTY, catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  AnalysisJobsService,
  ApiV1AnalysisJobsGet200ResponseDataInner,
  ApiV1ProjectsGet200ResponseDataProjectsInner,
  ProjectsService,
} from '@sentinel-api';
import { LintStatusComponent } from '../lint-status/lint-status.component';
import { ProjectSelectorComponent } from '@shared/ui-custom';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { Router } from '@angular/router';

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
        <sen-lint-status [job]="job()" />
      }
    </div>
  `,
})
export class LintCreateComponent implements OnInit {
  private analysisService = inject(AnalysisJobsService);
  private projectsService = inject(ProjectsService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);

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

  readonly canStartAnalysis = computed(() => {
    return (
      this.selectedProjectId() !== null &&
      !this.isLoading() &&
      !this.isJobRunning()
    );
  });

  constructor() {}

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
          this.router.navigate(['/linting', response.data.id, 'results']);
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

  private resetState(): void {
    this.isLoading.set(false);
    this.errorMessage.set(null);
    this.job.set(null);
    this.analysisResults.set(null);
    this.currentJobId.set(null);
  }
}
