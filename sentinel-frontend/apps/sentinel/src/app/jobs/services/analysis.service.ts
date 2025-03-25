import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  AnalysisResults,
  MatchesByRule,
} from '../components/model/analysis/analysis.model';
import { AnalysisJob } from '../components/model/analysis/analysisJob.model';

export interface StartAnalysisResponse {
  id: number;
  jobId: string;
  status: string;
}

interface AnalysisJobListResponse {
  analysisJobs: AnalysisJob[];
  meta: {
    totalCount: number;
    page: number;
    perPage: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AnalysisService {
  private apiUrl = 'http://localhost:3000/api/v1';

  constructor(private http: HttpClient) {}

  /**
   * Start a new analysis job using Rails API which will trigger the Go service
   * @param projectId The ID of the project to analyze
   * @returns Observable with the job ID and initial status
   */
  startAnalysis(projectId: string) {
    return this.http
      .post<StartAnalysisResponse>(`${this.apiUrl}/analysis_jobs`, {
        project_id: projectId,
      })
      .pipe(
        map((response) => ({
          jobId: response.id,
          status: response.status,
        }))
      );
  }

  /**
   * Load all analysis jobs
   * @returns Observable with an array of all analysis jobs
   */
  loadAnalysisJobs() {
    return this.http
      .get<AnalysisJobListResponse>(`${this.apiUrl}/analysis_jobs`)
      .pipe(
        map((response) =>
          response.analysisJobs.map((job) => ({
            id: job.id,
            status: job.status,
            startTime: job.createdAt,
            completedTime: job.completedAt,
            projectId: job.projectId,
          }))
        )
      );
  }

  /**
   * Get the status of an analysis job
   * @param jobId The ID of the job to check
   * @returns Observable with the current job status and details
   */
  getJobStatus(jobId: number) {
    return this.http
      .get<AnalysisJob>(`${this.apiUrl}/analysis_jobs/${jobId}`)
      .pipe(
        map((response) => ({
          id: response.id,
          status: response.status,
          startTime: response.createdAt,
          completedTime: response.updatedAt,
          projectId: response.projectId,
        }))
      );
  }

  /**
   * Get the full analysis results for a completed job
   * @param jobId The ID of the job to get results for
   * @returns Observable with the analysis results
   */
  getAnalysisResults(jobId: number): Observable<AnalysisResults> {
    return this.http
      .get<AnalysisResults>(
        `${this.apiUrl}/analysis_jobs/${jobId}/fetch_results`
      )
      .pipe(
        map((response) => {
          const matchesByRule: MatchesByRule = {};

          if (response.matchesByRule) {
            Object.assign(matchesByRule, response.matchesByRule);
          } else if (
            response.detailedResult &&
            Array.isArray(response.detailedResult)
          ) {
            response.detailedResult.forEach((result) => {
              if (result.matches && Array.isArray(result.matches)) {
                result.matches.forEach((match) => {
                  const ruleName = match.ruleName || 'Unknown Rule';
                  matchesByRule[ruleName] = (matchesByRule[ruleName] || 0) + 1;
                });
              }
            });
          }

          return {
            totalFiles: response.totalFiles || 0,
            totalMatches: response.totalMatches || 0,
            matchesByRule,
            detailedResult: response.detailedResult || [],
            groupedMatches: response.groupedMatches || {},
          };
        })
      );
  }

  /**
   * Get pattern matches for a specific analysis job
   * @param jobId The ID of the job to get pattern matches for
   * @param options Optional filtering options
   * @returns Observable with paginated pattern matches
   */
  getPatternMatches(
    jobId: number,
    options: {
      page?: number;
      per_page?: number;
      rule_id?: string;
      rule_name?: string;
      file_path?: string;
    } = {}
  ): Observable<{
    matches: any[];
    total_count: number;
    current_page: number;
    total_pages: number;
    analysis_job_id: number;
  }> {
    let params = new HttpParams();

    if (options.page) {
      params = params.set('page', options.page.toString());
    }

    if (options.per_page) {
      params = params.set('per_page', options.per_page.toString());
    }

    if (options.rule_id) {
      params = params.set('rule_id', options.rule_id);
    }

    if (options.rule_name) {
      params = params.set('rule_name', options.rule_name);
    }

    if (options.file_path) {
      params = params.set('file_path', options.file_path);
    }

    return this.http.get<any>(
      `${this.apiUrl}/analysis_jobs/${jobId}/pattern_matches`,
      { params }
    );
  }

  /**
   * Get pattern matches time series data (counts over time)
   * @param options Options to filter the time series data
   * @returns Observable with pattern match counts by date
   */
  getPatternMatchesTimeSeries(
    options: {
      job_id?: number;
      start_date?: string;
      end_date?: string;
      rule_id?: string;
      rule_name?: string;
    } = {}
  ): Observable<{ date: string; count: number }[]> {
    let url = `${this.apiUrl}/pattern_matches/time_series`;
    let params = new HttpParams();

    // If job_id is provided, use the nested route
    if (options.job_id) {
      url = `${this.apiUrl}/analysis_jobs/${options.job_id}/pattern_matches/time_series`;
    }

    if (options.start_date) {
      params = params.set('start_date', options.start_date);
    }

    if (options.end_date) {
      params = params.set('end_date', options.end_date);
    }

    if (options.rule_id) {
      params = params.set('rule_id', options.rule_id);
    }

    if (options.rule_name) {
      params = params.set('rule_name', options.rule_name);
    }

    return this.http.get<{ date: string; count: number }[]>(url, { params });
  }
}
