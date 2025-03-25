import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { ProjectsService } from 'src/app/api/generated/api/projects.service';
import { Project } from 'src/app/api/generated/model/project';
import { ApiV1ProjectsPost201Response } from 'src/app/api/generated/model/api-v1-projects-post201-response';
@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, HlmButtonDirective],
  providers: [ProjectsService],
  template: `
    <div class="px-4 sm:px-6 lg:px-8">
      <div class="sm:flex sm:items-center">
        <div class="sm:flex-auto">
          <h1 class="text-base font-semibold text-gray-900">
            {{ project()?.name || 'Project Details' }}
          </h1>
          <p class="mt-2 text-sm text-gray-700">
            Details for the selected project.
          </p>
        </div>
        <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button routerLink="/projects" type="button" hlmBtn>
            Back to Projects
          </button>
        </div>
      </div>

      @if (isLoading()) {
      <div class="flex justify-center py-8">
        <div
          class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"
        ></div>
      </div>
      } @else if (errorMessage()) {
      <div class="bg-red-50 p-4 rounded-md mt-4">
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
            <h3 class="text-sm font-medium text-red-800">
              {{ errorMessage() }}
            </h3>
          </div>
        </div>
      </div>
      } @else if (project()) {
      <div class="mt-8 flow-root">
        <div class="bg-white shadow overflow-hidden sm:rounded-lg">
          <div class="px-4 py-5 sm:px-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Project Information
            </h3>
          </div>
          <div class="border-t border-gray-200">
            <dl>
              <div
                class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"
              >
                <dt class="text-sm font-medium text-gray-500">Project name</dt>
                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {{ project()?.name }}
                </dd>
              </div>
              <div
                class="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"
              >
                <dt class="text-sm font-medium text-gray-500">
                  Repository URL
                </dt>
                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {{ project()?.repository_url }}
                </dd>
              </div>
              <div
                class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"
              >
                <dt class="text-sm font-medium text-gray-500">Status</dt>
                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {{ project() }}
                </dd>
              </div>
              <div
                class="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"
              >
                <dt class="text-sm font-medium text-gray-500">Created at</dt>
                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {{ project()?.created_at | date : 'medium' }}
                </dd>
              </div>
              <div
                class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"
              >
                <dt class="text-sm font-medium text-gray-500">Last updated</dt>
                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {{ project()?.updated_at | date : 'medium' }}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class ProjectDetailComponent implements OnInit {
  project = signal<Project | null>(null);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string>('');

  constructor(
    private route: ActivatedRoute,
    private projectsService: ProjectsService
  ) {}

  ngOnInit(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (!projectId) {
      this.errorMessage.set('Project ID not found');
      this.isLoading.set(false);
      return;
    }

    this.projectsService
      .apiV1ProjectsIdGet({ id: parseInt(projectId) })
      .subscribe({
        next: (response: ApiV1ProjectsPost201Response) => {
          this.project.set(response.data || null);
          this.isLoading.set(false);
        },
        error: (error: Error) => {
          this.errorMessage.set('Failed to fetch project details');
          this.isLoading.set(false);
          console.error('Error fetching project details:', error);
        },
      });
  }
}
