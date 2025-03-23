import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  AnalysisResults,
  MatchesByRule,
} from '../components/model/analysis/analysis.model';
export interface AnalysisJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: string;
  completedTime?: string;
  resultPath?: string;
  error?: string;
  projectId?: string;
}

export interface StartAnalysisResponse {
  jobId: string;
  status: string;
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
  startAnalysis(projectId: string): Observable<StartAnalysisResponse> {
    return this.http
      .post<any>(`${this.apiUrl}/analysis_jobs`, {
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
  loadAnalysisJobs(): Observable<AnalysisJob[]> {
    return this.http.get<any[]>(`${this.apiUrl}/analysis_jobs`).pipe(
      map((response) =>
        response.map((job) => ({
          id: job.id,
          status: job.status,
          startTime: job.created_at,
          completedTime: job.completed_at,
          error: job.error_message,
          projectId: job.project_id,
        }))
      )
    );
  }

  /**
   * Get the status of an analysis job
   * @param jobId The ID of the job to check
   * @returns Observable with the current job status and details
   */
  getJobStatus(jobId: string): Observable<AnalysisJob> {
    return this.http.get<any>(`${this.apiUrl}/analysis_jobs/${jobId}`).pipe(
      map((response) => ({
        id: response.id,
        status: response.status,
        startTime: response.created_at,
        completedTime: response.updated_at,
        error: response.error_message,
        projectId: response.project_id,
      }))
    );
  }

  /**
   * Get the full analysis results for a completed job
   * @param jobId The ID of the job to get results for
   * @returns Observable with the analysis results
   */
  getAnalysisResults(jobId: string): Observable<AnalysisResults> {
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
}
