import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AnalysisService, AnalysisJob } from '../../services/analysis.service';
import { ProjectsService } from '../../../projects/services/projects.service';
import { catchError, map, of } from 'rxjs';
import { DatePipe } from '@angular/common';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';

// Interface combining AnalysisJob with project name for display
interface JobWithProject extends AnalysisJob {
  projectName?: string;
  statusClass?: string;
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
  jobs: JobWithProject[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(
    private analysisService: AnalysisService,
    private projectsService: ProjectsService,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.isLoading = true;

    // First, get all projects to create a map of project IDs to names
    this.projectsService
      .getProjects()
      .pipe(
        map((projects) => {
          // Create a map of project IDs to their names
          const projectMap = new Map<string, string>();
          projects.forEach((project) => {
            projectMap.set(project.id, project.name);
          });
          return projectMap;
        }),
        catchError((error) => {
          console.error('Error loading projects:', error);
          this.errorMessage =
            'Failed to load projects. Please try again later.';
          this.isLoading = false;
          return of(new Map<string, string>());
        })
      )
      .subscribe((projectMap) => {
        // Then, load all analysis jobs
        this.analysisService
          .loadAnalysisJobs()
          .pipe(
            map((jobs) => {
              // Add project names and status classes to jobs
              return jobs.map((job) => {
                const enrichedJob: JobWithProject = {
                  ...job,
                  projectName: job.projectId
                    ? projectMap.get(job.projectId)
                    : 'Unknown',
                  statusClass: this.getStatusClass(job.status),
                };
                return enrichedJob;
              });
            }),
            catchError((error) => {
              console.error('Error loading analysis jobs:', error);
              this.errorMessage =
                'Failed to load analysis jobs. Please try again later.';
              return of([] as JobWithProject[]);
            })
          )
          .subscribe((jobs) => {
            this.jobs = jobs.sort((a, b) => {
              // Sort by creation date, newest first
              const dateA = a.startTime ? new Date(a.startTime).getTime() : 0;
              const dateB = b.startTime ? new Date(b.startTime).getTime() : 0;
              return dateB - dateA;
            });
            this.isLoading = false;
          });
      });
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
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'queued':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
