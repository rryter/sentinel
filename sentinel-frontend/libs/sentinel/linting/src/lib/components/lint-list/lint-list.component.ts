import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  AnalysisJobsService,
  ApiV1AnalysisJobsGet200ResponseDataInner,
  ProjectsService,
} from '@sentinel/api';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { map, switchMap } from 'rxjs/operators';

@Component({
  selector: 'sen-lint-list',
  imports: [CommonModule, RouterModule, HlmButtonDirective],
  providers: [DatePipe],
  templateUrl: './lint-list.component.html',
  styleUrls: ['./lint-list.component.scss'],
})
export class LintListComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  jobs: ApiV1AnalysisJobsGet200ResponseDataInner[] = [];
  sortedJobs: ApiV1AnalysisJobsGet200ResponseDataInner[] = [];
  projectMap = new Map<number, string>();
  currentProjectName = 'sentinel';
  Math = Math;

  constructor(
    private analysisService: AnalysisJobsService,
    private projectsService: ProjectsService,
    private datePipe: DatePipe,
  ) {}

  ngOnInit(): void {
    this.isLoading = true;

    this.projectsService
      .apiV1ProjectsGet()
      .pipe(
        map((response) => {
          if (response.data) {
            response.data.projects.forEach((project) => {
              if (project.id) {
                this.projectMap.set(
                  project.id,
                  project.name || 'Unnamed Project',
                );
              }
            });
          }
          return response;
        }),
        switchMap(() => this.analysisService.apiV1AnalysisJobsGet()),
        map((response) => {
          console.log('Raw API Response:', JSON.stringify(response, null, 2));
          return response.data || [];
        }),
      )
      .subscribe({
        next: (jobs) => {
          this.jobs = jobs;
          // Sort jobs by creation date (newest first)
          this.sortedJobs = [...jobs].sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );

          // Set current project name from the newest job
          if (this.sortedJobs.length > 0 && this.sortedJobs[0].project) {
            this.currentProjectName =
              this.sortedJobs[0].project.name || 'sentinel';
          }

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

  formatShortDate(date: string | null | undefined): string {
    if (!date) return 'N/A';
    return this.datePipe.transform(date, 'MMM d') || 'Invalid date';
  }

  formatNumber(num: number | null | undefined): string {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
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

  getEfficiencyColorClass(efficiency: number): string {
    if (efficiency >= 80) {
      return 'bg-green-500';
    } else if (efficiency >= 70) {
      return 'bg-yellow-500';
    } else {
      return 'bg-red-500';
    }
  }

  getPercentChange(
    currentJob: ApiV1AnalysisJobsGet200ResponseDataInner,
    field: keyof ApiV1AnalysisJobsGet200ResponseDataInner,
    index: number,
  ): number {
    if (index >= this.sortedJobs.length - 1) return 0; // No previous job to compare

    const prevJob = this.sortedJobs[index + 1];
    const currentValue = currentJob[field] as number;
    const prevValue = prevJob[field] as number;

    if (!prevValue) return 0;

    const percentChange = ((currentValue - prevValue) / prevValue) * 100;
    return Math.round(percentChange * 10) / 10; // Round to 1 decimal place
  }

  getChangeColorClass(percentChange: number, positiveIsGood = true): string {
    if (percentChange === 0) return '';

    if (positiveIsGood) {
      return percentChange > 0 ? 'text-green-600' : 'text-red-600';
    } else {
      return percentChange < 0 ? 'text-green-600' : 'text-red-600';
    }
  }

  trackById(
    index: number,
    item: ApiV1AnalysisJobsGet200ResponseDataInner,
  ): number {
    return item.id || index;
  }
}
