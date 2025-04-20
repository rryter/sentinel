import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiV1ProjectsGet200ResponseDataProjectsInner } from '@sentinel-api';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectImports } from '@spartan-ng/ui-select-helm';

@Component({
  selector: 'app-project-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, BrnSelectImports, HlmSelectImports],
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
          <brn-select
            class="inline-block"
            placeholder="Select a project"
            [(ngModel)]="selectedId"
            (ngModelChange)="selectionChange.emit($event)"
            [disabled]="disabled"
          >
            <hlm-select-trigger class="w-56">
              <hlm-select-value />
            </hlm-select-trigger>
            <hlm-select-content>
              @for (project of projects; track project.id) {
                <hlm-option [value]="project.id">{{ project.name }}</hlm-option>
              }
            </hlm-select-content>
          </brn-select>
        }
      </div>
    </div>
  `,
})
export class ProjectSelectorComponent {
  @Input() projects: ApiV1ProjectsGet200ResponseDataProjectsInner[] = [];
  @Input() isLoading = false;
  @Input() disabled = false;
  @Input() selectedId: number | null = null;
  @Output() selectionChange = new EventEmitter<number>();
}
