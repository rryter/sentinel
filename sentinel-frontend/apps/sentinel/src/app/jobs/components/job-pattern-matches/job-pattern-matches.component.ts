import { Component, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  BehaviorSubject,
  Observable,
  catchError,
  combineLatest,
  map,
  of,
  switchMap,
} from 'rxjs';
import { PatternMatchesChartComponent } from '../pattern-matches-chart/pattern-matches-chart.component';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { PatternMatchesService } from 'src/app/api/generated/api/pattern-matches.service';
import { ApiV1AnalysisJobsAnalysisJobIdPatternMatchesGet200Response } from 'src/app/api/generated/model/api-v1-analysis-jobs-analysis-job-id-pattern-matches-get200-response';

@Component({
  selector: 'app-job-pattern-matches',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    PatternMatchesChartComponent,
    HlmButtonDirective,
  ],
  templateUrl: './job-pattern-matches.component.html',
  styleUrl: './job-pattern-matches.component.scss',
})
export class JobPatternMatchesComponent implements OnInit {
  jobId = input<number>(0);

  isLoading = true;
  error: string | null = null;

  // Filters
  ruleNameFilter = '';
  filePathFilter = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // Reactive filter stream
  private filtersChanged = new BehaviorSubject<void>(undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patternMatches$: Observable<
    ApiV1AnalysisJobsAnalysisJobIdPatternMatchesGet200Response | undefined
  > | null = null;

  constructor(private patternMatchesService: PatternMatchesService) {}

  ngOnInit(): void {
    this.setupDataStream();
  }

  private setupDataStream(): void {
    // Combine the job ID with filter changes to create a stream of filter updates
    const jobId = this.jobId();
    if (!jobId) {
      this.error = 'No job ID provided';
      this.isLoading = false;
      return;
    }

    this.patternMatches$ = combineLatest([of(jobId), this.filtersChanged]).pipe(
      switchMap(([jobId]) => {
        this.isLoading = true;

        return this.patternMatchesService
          .apiV1AnalysisJobsAnalysisJobIdPatternMatchesGet({
            analysisJobId: jobId,
            page: this.currentPage,
            perPage: this.pageSize,
            ruleName: this.ruleNameFilter || undefined,
            filePath: this.filePathFilter || undefined,
          })
          .pipe(
            map((response) => {
              this.isLoading = false;
              return response;
            }),
            catchError((error) => {
              console.error('Error fetching pattern matches:', error);
              this.error =
                'Failed to load pattern matches. Please try again later.';
              this.isLoading = false;
              return of(undefined);
            })
          );
      })
    );

    // Trigger initial load
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.currentPage = 1; // Reset to first page when filters change
    this.filtersChanged.next();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.filtersChanged.next();
  }
}
