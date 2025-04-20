import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Project } from '../model/project';
import { ApiV1ProjectsPostRequest } from '../model/api-v1-projects-post-request';

@Injectable({
  providedIn: 'root'
})
export class ProjectsService {
  private baseUrl = 'http://localhost:3000/api/v1';

  constructor(private http: HttpClient) {}

  apiV1ProjectsGet(): Observable<{ data: Project[] }> {
    return this.http.get<{ data: Project[] }>(`${this.baseUrl}/projects`);
  }

  apiV1ProjectsIdGet(id: number): Observable<{ data: Project }> {
    return this.http.get<{ data: Project }>(`${this.baseUrl}/projects/${id}`);
  }

  apiV1ProjectsPost(requestParameters: { apiV1ProjectsPostRequest: ApiV1ProjectsPostRequest }): Observable<{ data: { project: Project } }> {
    const githubToken = localStorage.getItem('github_token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(githubToken ? { 'Authorization': `Bearer ${githubToken}` } : {})
    });

    return this.http.post<{ data: { project: Project } }>(
      `${this.baseUrl}/projects`,
      requestParameters.apiV1ProjectsPostRequest,
      { headers }
    );
  }

  cloneRepository(id: number): Observable<{ message: string; path: string }> {
    const githubToken = localStorage.getItem('github_token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(githubToken ? { 'Authorization': `Bearer ${githubToken}` } : {})
    });

    return this.http.post<{ message: string; path: string }>(
      `${this.baseUrl}/projects/${id}/clone_repository`,
      {},
      { headers }
    );
  }
} 