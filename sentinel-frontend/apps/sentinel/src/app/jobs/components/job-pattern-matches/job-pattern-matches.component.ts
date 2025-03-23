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
    <div class="px-4 py-6 sm:px-6 lg:px-8">
      <div class="sm:flex sm:items-center mb-6">
        <div class="sm:flex-auto">
          <h1 class="text-xl font-semibold text-gray-900">Pattern Matches</h1>
          <p class="mt-2 text-sm text-gray-700">
            Viewing pattern matches for analysis job
          </p>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-4 mb-6">
        <div class="w-full sm:w-1/2">
          <label
            for="rule-filter"
            class="block text-sm font-medium text-gray-700 mb-1"
            >Rule Name</label
          >
          <input
            id="rule-filter"
            type="text"
            [(ngModel)]="ruleNameFilter"
            (change)="onFilterChange()"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div class="w-full sm:w-1/2">
          <label
            for="file-filter"
            class="block text-sm font-medium text-gray-700 mb-1"
            >File Path</label
          >
          <input
            id="file-filter"
            type="text"
            [(ngModel)]="filePathFilter"
            (change)="onFilterChange()"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div *ngIf="isLoading" class="flex justify-center py-8">
        <div
          class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"
        ></div>
      </div>

      <div *ngIf="error" class="bg-red-50 p-4 rounded-md mt-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg
              class="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">{{ error }}</h3>
          </div>
        </div>
      </div>

      @if (patternMatches$ | async; as result) {
      <div>
        <div
          *ngIf="result?.matches?.length === 0"
          class="text-center py-8 text-gray-500"
        >
          No pattern matches found.
        </div>

        <div *ngIf="result?.matches?.length > 0">
          <div class="space-y-4">
            <div
              *ngFor="let match of result.matches"
              class="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden"
            >
              <div
                class="bg-gray-50 px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between"
              >
                <span class="font-medium text-gray-800">{{
                  match.rule_name
                }}</span>
                <span
                  class="mt-1 sm:mt-0 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded break-all"
                >
                  {{ match.analysis_file.file_path }}
                </span>
              </div>
              <div class="p-4">
                <div class="text-gray-700 mb-3">
                  {{ match.description }}
                </div>
                <div
                  class="font-mono text-sm bg-gray-100 px-2 py-1 rounded inline-block mb-3"
                >
                  Line {{ match.start_line }}:{{ match.start_col }} -
                  {{ match.end_line }}:{{ match.end_col }}
                </div>
                <div
                  *ngIf="match.metadata?.suggestion"
                  class="mt-3 bg-blue-50 p-3 border-l-4 border-blue-500 rounded-r-md"
                >
                  <pre class="whitespace-pre-wrap text-sm text-gray-700">{{
                    match.metadata.suggestion
                  }}</pre>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-6 flex items-center justify-center gap-3">
            <button
              [disabled]="currentPage <= 1"
              (click)="onPageChange(currentPage - 1)"
              class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span class="text-sm text-gray-700">
              Page {{ result.current_page }} of {{ result.total_pages }}
            </span>
            <button
              [disabled]="currentPage >= result.total_pages"
              (click)="onPageChange(currentPage + 1)"
              class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      }
    </div>
  `,
  styles: [],
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
