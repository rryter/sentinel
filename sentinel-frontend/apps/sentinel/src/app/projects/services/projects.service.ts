import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

export interface Project {
  id: string;
  name: string;
  repository_url: string;
  created_at: string;
  updated_at: string;
}

export interface AnalysisJob {
  id: string;
  project_id: string;
  status: string;
  total_files: number;
  processed_files: number;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithJobs extends Project {
  analysis_jobs: AnalysisJob[];
}

@Injectable({
  providedIn: 'root',
})
export class ProjectsService {
  private apiUrl = 'http://localhost:3000/api/v1';

  constructor(private http: HttpClient) {}

  /**
   * Fetches all projects from the API
   * @returns Observable with an array of projects
   */
  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/projects`).pipe(
      catchError((error) => {
        console.error('Error fetching projects:', error);
        return of([]); // Return empty array on error
      })
    );
  }

  /**
   * Creates a new project
   * @param project The project to create
   * @returns Observable with the created project
   */
  createProject(project: {
    name: string;
    repository_url: string;
  }): Observable<Project> {
    return this.http.post<Project>(`${this.apiUrl}/projects`, { project });
  }

  /**
   * Gets a project by ID
   * @param id The project ID
   * @returns Observable with the project and its associated analysis jobs
   */
  getProject(id: string): Observable<ProjectWithJobs> {
    return this.http.get<ProjectWithJobs>(`${this.apiUrl}/projects/${id}`);
  }

  /**
   * Creates a new analysis job for a project
   * @param projectId The project ID to analyze
   * @returns Observable with the created analysis job
   */
  createAnalysisJob(projectId: string): Observable<AnalysisJob> {
    return this.http.post<AnalysisJob>(`${this.apiUrl}/analysis_jobs`, {
      project_id: projectId,
    });
  }

  /**
   * Gets analysis results for a job
   * @param jobId The analysis job ID
   * @returns Observable with the analysis results
   */
  getAnalysisResults(jobId: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/analysis_jobs/${jobId}/fetch_results`
    );
  }

  /**
   * Process and store analysis results
   * @param jobId The analysis job ID
   * @returns Observable with processing status
   */
  processAnalysisResults(jobId: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/analysis_jobs/${jobId}/process_results`,
      {}
    );
  }
}
