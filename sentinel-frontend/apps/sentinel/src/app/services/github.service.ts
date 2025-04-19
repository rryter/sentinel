import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class GitHubService {
  private accessToken = new BehaviorSubject<string | null>(null);
  private readonly clientId = environment.githubClientId;
  private readonly redirectUri = `${window.location.origin}/auth/github/callback`;

  constructor(private http: HttpClient) {
    // Check if we have a token in localStorage
    const token = localStorage.getItem('github_token');
    if (token) {
      this.accessToken.next(token);
    }
  }

  initiateGitHubLogin(): void {
    const scope = 'repo read:user';
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${this.clientId}&redirect_uri=${this.redirectUri}&scope=${scope}`;
    window.location.href = githubAuthUrl;
  }

  handleAuthCallback(code: string): Observable<any> {
    return this.http.post('http://localhost:3000/api/v1/auth/github/callback', { code });
  }

  setAccessToken(token: string): void {
    localStorage.setItem('github_token', token);
    this.accessToken.next(token);
  }

  getRepositories(): Observable<GitHubRepository[]> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.accessToken.value}`
    });

    return this.http.get<GitHubRepository[]>('http://localhost:3000/api/v1/github/repositories', { headers });
  }

  isAuthenticated(): boolean {
    return !!this.accessToken.value;
  }

  logout(): void {
    localStorage.removeItem('github_token');
    this.accessToken.next(null);
  }
} 