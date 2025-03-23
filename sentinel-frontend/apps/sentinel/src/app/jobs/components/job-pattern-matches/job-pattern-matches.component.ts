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

@Component({
  selector: 'app-job-pattern-matches',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="pattern-matches">
      <h2>Pattern Matches for Analysis Job</h2>

      <div class="filters">
        <div class="filter-item">
          <label for="rule-filter">Rule Name:</label>
          <input
            id="rule-filter"
            type="text"
            [(ngModel)]="ruleNameFilter"
            (change)="onFilterChange()"
          />
        </div>

        <div class="filter-item">
          <label for="file-filter">File Path:</label>
          <input
            id="file-filter"
            type="text"
            [(ngModel)]="filePathFilter"
            (change)="onFilterChange()"
          />
        </div>
      </div>

      <div *ngIf="isLoading" class="loading">Loading pattern matches...</div>

      <div *ngIf="error" class="error">
        {{ error }}
      </div>

      @if (patternMatches$ | async; as result) {
      <div>
        <div *ngIf="result?.matches?.length === 0" class="no-results">
          No pattern matches found.
        </div>

        <div>
          <div class="matches-list">
            <div *ngFor="let match of result.matches" class="match-item">
              <div class="match-header">
                <strong>{{ match.rule_name }}</strong>
                <span class="file-path">{{
                  match.analysis_file.file_path
                }}</span>
              </div>
              <div class="match-description">
                {{ match.description }}
              </div>
              <div class="match-location">
                Line {{ match.start_line }}:{{ match.start_col }} -
                {{ match.end_line }}:{{ match.end_col }}
              </div>
              <div *ngIf="match.metadata" class="match-metadata">
                <div *ngIf="match.metadata.suggestion" class="suggestion">
                  <pre>{{ match.metadata.suggestion }}</pre>
                </div>
              </div>
            </div>
          </div>

          <div class="pagination">
            <button
              [disabled]="currentPage <= 1"
              (click)="onPageChange(currentPage - 1)"
            >
              Previous
            </button>
            <span
              >Page {{ result.current_page }} of {{ result.total_pages }}</span
            >
            <button
              [disabled]="currentPage >= result.total_pages"
              (click)="onPageChange(currentPage + 1)"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .pattern-matches {
        padding: 20px;
      }

      .filters {
        display: flex;
        gap: 15px;
        margin-bottom: 20px;
      }

      .filter-item {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .filter-item input {
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
      }

      .loading,
      .error,
      .no-results {
        padding: 20px;
        text-align: center;
      }

      .error {
        color: red;
      }

      .matches-list {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }

      .match-item {
        padding: 15px;
        border: 1px solid #eee;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .match-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
      }

      .file-path {
        color: #666;
        font-size: 0.9em;
        word-break: break-all;
        background-color: #f7f7f7;
        padding: 3px 6px;
        border-radius: 3px;
        margin-left: 10px;
      }

      .match-description {
        margin-bottom: 10px;
      }

      .match-location {
        font-family: monospace;
        background-color: #f5f5f5;
        padding: 3px 6px;
        border-radius: 3px;
        display: inline-block;
        margin-bottom: 10px;
      }

      .match-metadata {
        margin-top: 10px;
      }

      .suggestion {
        background-color: #f8f8f8;
        padding: 10px;
        border-left: 3px solid #007bff;
        font-size: 0.9em;
        white-space: pre-wrap;
      }

      .suggestion pre {
        margin: 0;
        white-space: pre-wrap;
      }

      .pagination {
        margin-top: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 15px;
      }

      .pagination button {
        padding: 8px 15px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }

      .pagination button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
      }
    `,
  ],
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
