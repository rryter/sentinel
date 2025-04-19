import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GitHubService } from '../../services/github.service';

@Component({
  selector: 'app-github-callback',
  standalone: true,
  template: `
    <div class="flex min-h-screen items-center justify-center">
      <div class="text-center">
        <h2 class="text-base font-semibold text-indigo-600">Processing</h2>
        <p class="mt-1 text-sm text-gray-500">
          Please wait while we complete your GitHub authentication...
        </p>
      </div>
    </div>
  `,
})
export class GitHubCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private githubService: GitHubService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      if (code) {
        this.githubService.handleAuthCallback(code).subscribe({
          next: (response) => {
            this.githubService.setAccessToken(response.access_token);
            this.router.navigate(['/projects/create']);
          },
          error: (error) => {
            console.error('GitHub authentication error:', error);
            this.router.navigate(['/projects/create']);
          }
        });
      } else {
        this.router.navigate(['/projects/create']);
      }
    });
  }
} 