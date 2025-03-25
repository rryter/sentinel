import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { AnalysisJobsService } from 'src/app/api/generated/api/analysis-jobs.service';
import { ProjectsService } from 'src/app/api/generated/api/projects.service';

interface Project {
  id: number;
  name: string;
  repositoryUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectsResponse {
  projects: Project[];
}

interface AnalysisJob {
  id: number;
  projectId: number;
  status: string;
  totalFiles: number;
  processedFiles: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  goJobId: string;
  processingStatus: string;
  filesWithViolations: Array<{ id: number; filePath: string }>;
  patternMatches: Array<{
    id: number;
    ruleId: string;
    ruleName: string;
    lineNumber: number;
    column: number;
    matchText: string;
  }>;
}

interface AnalysisJobsResponse {
  analysisJobs: AnalysisJob[];
}

@Component({
  selector: 'app-analysis-job-list',
  standalone: true,
  imports: [CommonModule, RouterModule, HlmButtonDirective],
  providers: [DatePipe],
  templateUrl: './analysis-job-list.component.html',
  styleUrls: ['./analysis-job-list.component.scss'],
})
export class AnalysisJobListComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  jobs: AnalysisJob[] = [];
  projectMap = new Map<number, string>();

  constructor(
    private analysisService: AnalysisJobsService,
    private projectsService: ProjectsService,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.isLoading = true;

    this.projectsService
      .apiV1ProjectsGet()
      .pipe(
        map((response) => {
          const typedResponse = response as unknown as ProjectsResponse;
          if (typedResponse?.projects) {
            typedResponse.projects.forEach((project) => {
              if (project.id) {
                this.projectMap.set(
                  project.id,
                  project.name || 'Unnamed Project'
                );
              }
            });
          }
        }),
        switchMap(() => this.analysisService.apiV1AnalysisJobsGet({})),
        map((response) => {
          const typedResponse = response as unknown as AnalysisJobsResponse;
          if (!typedResponse?.analysisJobs) return [];

          return typedResponse.analysisJobs.sort(
            (a: AnalysisJob, b: AnalysisJob) => {
              // Sort by creation date, newest first
              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return dateB - dateA;
            }
          );
        })
      )
      .subscribe({
        next: (jobs) => {
          this.jobs = jobs;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error:', error);
          this.errorMessage = 'Failed to load data. Please try again later.';
          this.isLoading = false;
        },
      });
  }

  getProjectName(projectId: number): string {
    return this.projectMap.get(projectId) || 'Unknown Project';
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return 'N/A';
    return this.datePipe.transform(date, 'MMM d, y, h:mm a') || 'Invalid date';
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  trackById(index: number, item: AnalysisJob): number {
    return item.id;
  }
}
