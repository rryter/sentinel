import { Component } from '@angular/core';
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
          <h1 class="text-base font-semibold text-gray-900">Create Project</h1>
          <p class="mt-2 text-sm text-gray-700">
            Add a new code repository for analysis.
          </p>
        </div>
        <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button routerLink="/projects" type="button" hlmBtn variant="outline">
            Back to Projects
          </button>
        </div>
      </div>

      <form [formGroup]="projectForm" (ngSubmit)="onSubmit()" class="mt-8">
        <div class="space-y-12">
          <div class="border-b border-gray-900/10 pb-12">
            <h2 class="text-base/7 font-semibold text-gray-900">
              Project Information
            </h2>
            <p class="mt-1 text-sm/6 text-gray-600">
              Enter the details of your code repository for analysis.
            </p>

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
export class ProjectCreateComponent {
  projectForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private projectsService: ProjectsService,
    private router: Router
  ) {
    this.projectForm = this.fb.group({
      name: ['', Validators.required],
      repository_url: ['', Validators.required],
    });
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
