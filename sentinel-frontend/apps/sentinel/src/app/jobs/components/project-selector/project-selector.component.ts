import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiV1ProjectsGet200ResponseDataInner } from 'src/app/api/generated/model/api-v1-projects-get200-response-data-inner';

@Component({
  selector: 'app-project-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-4">
      <label
        for="project-select"
        class="block text-sm font-medium text-gray-700 mb-1"
      >
        Select Project to Analyze
      </label>
      <div class="relative">
        @if (isLoading) {
        <div class="flex items-center">
          <div
            class="mr-2 w-5 h-5 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"
          ></div>
          <span class="text-sm text-gray-500">Loading projects...</span>
        </div>
        } @else if (projects.length === 0) {
        <div class="p-3 border border-gray-300 rounded-md bg-gray-50">
          <p class="text-sm text-gray-500">
            No projects available. Please create a project first.
          </p>
        </div>
        } @else {
        <select
          id="project-select"
          class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:max-w-xs sm:text-sm sm:leading-6"
          [(ngModel)]="selectedId"
          (ngModelChange)="selectionChange.emit($event)"
          [disabled]="disabled"
        >
          <option [ngValue]="null" disabled>Select a project</option>
          @for (project of projects; track project.id) {
          <option [ngValue]="project.id">{{ project.name }}</option>
          }
        </select>
        }
      </div>
    </div>
  `,
})
export class ProjectSelectorComponent {
  @Input() projects: ApiV1ProjectsGet200ResponseDataInner[] = [];
  @Input() isLoading = false;
  @Input() disabled = false;
  @Input() selectedId: number | null = null;
  @Output() selectionChange = new EventEmitter<number>();
}
