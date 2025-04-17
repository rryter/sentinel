import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import {
  ApiV1ProjectsGet200ResponseDataProjectsInner,
  ProjectsService,
} from '@sentinel-api';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, RouterModule, HlmButtonDirective],
  providers: [ProjectsService],
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss'],
})
export class ProjectListComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  projects: ApiV1ProjectsGet200ResponseDataProjectsInner[] = [];

  constructor(private projectsService: ProjectsService) {}

  ngOnInit() {
    this.loadProjects();
  }

  private loadProjects() {
    this.projectsService.apiV1ProjectsGet().subscribe({
      next: (response) => {
        this.projects = (response.data.projects || []).map((project) => ({
          id: project.id,
          name: project.name,
          repository_url: project.repository_url,
          created_at: project.created_at,
          updated_at: project.updated_at,
        }));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.errorMessage = 'Failed to load projects. Please try again later.';
        this.isLoading = false;
      },
    });
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
