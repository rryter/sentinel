import { Component, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AnalysisService, AnalysisJob } from '../../services/analysis.service';
import { catchError, map, NEVER, Observable, of, switchMap } from 'rxjs';
import { AnalysisResults } from '../model/analysis/analysis.model';

interface RuleEntry {
  name: string;
  count: number;
}

@Component({
  selector: 'app-analysis-results',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './analysis-results.component.html',
  styleUrl: './analysis-results.component.scss',
})
export class AnalysisResultsComponent implements OnInit {
  jobId = input<string>('');
  analysisJob: AnalysisJob | null = null;
  isLoading = true;
  error: string | null = null;
  executionTimeSeconds = 0;

  vm$: Observable<{
    results: AnalysisResults;
    rulesCount: number;
    ruleEntries: RuleEntry[];
  } | null> | null = null;

  constructor(private analysisService: AnalysisService) {}

  ngOnInit(): void {
    this.isLoading = true;

    // Use the jobId input signal directly
    this.vm$ = this.buildViewModel(this.jobId());
  }

  private buildViewModel(jobId: string) {
    return this.analysisService.getJobStatus(jobId).pipe(
      catchError((error) => {
        console.error('Error fetching job status:', error);
        this.error = 'Failed to load job details. Please try again later.';
        this.isLoading = false;
        return of(null);
      }),
      switchMap((job) => {
        if (!job) {
          return of(null);
        }

        this.analysisJob = job;

        // Calculate execution time if job is completed
        if (job.startTime && job.completedTime) {
          const start = new Date(job.startTime).getTime();
          const end = new Date(job.completedTime).getTime();
          this.executionTimeSeconds = Math.round((end - start) / 1000);
        }

        // Only fetch results if job is completed
        if (job.status === 'completed') {
          return this.analysisService.getAnalysisResults(this.jobId()).pipe(
            map((results) => {
              return {
                results,
                job,
              };
            }),
            catchError((error) => {
              console.error('Error fetching analysis results:', error);
              this.error =
                'Failed to load analysis results. Please try again later.';
              return of(null);
            })
          );
        }

        return NEVER;
      }),
      map((w) => {
        this.isLoading = false;
        if (!w?.results) {
          return null;
        }

        return {
          job: w.job,
          results: w.results,
          rulesCount: Object.keys(w.results?.matchesByRule).length,
          ruleEntries: Object.entries(w.results?.matchesByRule).map(
            ([name, count]) => ({
              name,
              count: count as number,
            })
          ),
        };
      })
    );
  }

  // Format seconds to mm:ss format
  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
