import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { ProjectsService } from 'src/app/api/generated/api/projects.service';
import { GitHubService, GitHubRepository } from '../../../services/github.service';

@Component({
  selector: 'app-project-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    HlmButtonDirective,
  ],
  template: `
    <div class="px-4 sm:px-6 lg:px-8">
      <div class="sm:flex sm:items-center">
        <div class="sm:flex-auto">
          <h1 class="text-base/7 font-semibold text-gray-900">
            Project Information
          </h1>
          <p class="mt-1 text-sm/6 text-gray-600">
            Select a repository from GitHub or enter details manually.
          </p>
        </div>
        <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button routerLink="/projects" type="button" hlmBtn variant="outline">
            Back to Projects
          </button>
        </div>
      </div>

      @if (!githubService.isAuthenticated()) {
        <div class="mt-8">
          <button
            type="button"
            hlmBtn
            (click)="connectGitHub()"
            class="w-full justify-center"
          >
            <svg
              class="mr-2 h-5 w-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clip-rule="evenodd"
              />
            </svg>
            Connect with GitHub
          </button>
        </div>
      }

      @if (githubService.isAuthenticated()) {
        <div class="mt-8">
          <label
            for="repository"
            class="block text-sm/6 font-medium text-gray-900"
            >Select Repository</label
          >
          <select
            id="repository"
            (change)="onRepositorySelect($event)"
            class="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
          >
            <option value="">Select a repository...</option>
            @for (repo of repositories; track repo.id) {
              <option [value]="repo.full_name">{{ repo.full_name }}</option>
            }
          </select>
        </div>
      }

      <form [formGroup]="projectForm" (ngSubmit)="onSubmit()" class="mt-8">
        <div class="space-y-12">
          <div class="border-b border-gray-900/10 pb-12">
            <div class="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div class="sm:col-span-4">
                <label
                  for="name"
                  class="block text-sm/6 font-medium text-gray-900"
                  >Project Name</label
                >
                <div class="mt-2">
                  <input
                    type="text"
                    id="name"
                    formControlName="name"
                    class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    placeholder="My Project"
                  />
                </div>
                @if (projectForm.get('name')?.errors?.['required'] &&
                projectForm.get('name')?.touched) {
                <p class="mt-2 text-sm text-red-600">
                  Project name is required
                </p>
                }
              </div>

              <div class="col-span-full">
                <label
                  for="repository_url"
                  class="block text-sm/6 font-medium text-gray-900"
                  >Repository URL</label
                >
                <div class="mt-2">
                  <input
                    type="text"
                    id="repository_url"
                    formControlName="repository_url"
                    class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    placeholder="https://github.com/username/repository"
                  />
                </div>
                @if (projectForm.get('repository_url')?.errors?.['required'] &&
                projectForm.get('repository_url')?.touched) {
                <p class="mt-2 text-sm text-red-600">
                  Repository URL is required
                </p>
                }
              </div>
            </div>
          </div>
        </div>

        @if (errorMessage) {
        <div class="mt-6 rounded-md bg-red-50 p-4">
          <div class="flex">
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">
                {{ errorMessage }}
              </h3>
            </div>
          </div>
        </div>
        }

        <div class="mt-6 flex items-center justify-end gap-x-6">
          <button type="button" routerLink="/projects" hlmBtn variant="ghost">
            Cancel
          </button>
          <button
            type="submit"
            hlmBtn
            [disabled]="projectForm.invalid || isLoading"
          >
            @if (isLoading) {
            <span>Creating...</span>
            } @else {
            <span>Create Project</span>
            }
          </button>
        </div>
      </form>
    </div>
  `,
})
export class ProjectCreateComponent implements OnInit {
  projectForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  repositories: GitHubRepository[] = [];

  constructor(
    private fb: FormBuilder,
    private projectsService: ProjectsService,
    private router: Router,
    public githubService: GitHubService
  ) {
    this.projectForm = this.fb.group({
      name: ['', Validators.required],
      repository_url: ['', Validators.required],
    });
  }

  ngOnInit() {
    if (this.githubService.isAuthenticated()) {
      this.loadRepositories();
    }
  }

  connectGitHub() {
    this.githubService.initiateGitHubLogin();
  }

  loadRepositories() {
    this.githubService.getRepositories().subscribe({
      next: (repos) => {
        this.repositories = repos;
      },
      error: (error) => {
        console.error('Error loading repositories:', error);
        this.errorMessage = 'Failed to load repositories. Please try again.';
      }
    });
  }

  onRepositorySelect(event: Event) {
    const select = event.target as HTMLSelectElement;
    const repoFullName = select.value;
    if (repoFullName) {
      const repo = this.repositories.find(r => r.full_name === repoFullName);
      if (repo) {
        this.projectForm.patchValue({
          name: repo.name,
          repository_url: repo.html_url
        });
      }
    }
  }

  onSubmit() {
    if (this.projectForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.projectsService
      .apiV1ProjectsPost({
        apiV1ProjectsPostRequest: {
          project: this.projectForm.value,
        },
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/projects']);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage =
            error.error?.errors?.join(', ') ||
            'Failed to create project. Please try again.';
          console.error('Error creating project:', error);
        },
      });
  }
}
