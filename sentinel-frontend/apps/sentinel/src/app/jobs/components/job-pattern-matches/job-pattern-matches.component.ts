import { Component, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AnalysisService } from '../../services/analysis.service';
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

@Component({
  selector: 'app-job-pattern-matches',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    PatternMatchesChartComponent,
  ],
  templateUrl: './job-pattern-matches.component.html',
  styleUrl: './job-pattern-matches.component.scss',
})
export class JobPatternMatchesComponent implements OnInit {
  jobId = input<string>('');

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
  patternMatches$: Observable<any> | null = null;

  constructor(private analysisService: AnalysisService) {}

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

        return this.analysisService
          .getPatternMatches(jobId, {
            page: this.currentPage,
            per_page: this.pageSize,
            rule_name: this.ruleNameFilter || undefined,
            file_path: this.filePathFilter || undefined,
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
              return of({
                matches: [],
                total_count: 0,
                current_page: 1,
                total_pages: 0,
                analysis_job_id: jobId,
              });
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
