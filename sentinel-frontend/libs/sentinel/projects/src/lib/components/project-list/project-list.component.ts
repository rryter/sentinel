import { HlmButton } from '@spartan-ng/helm/button';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  ApiV1ProjectsGet200ResponseDataProjectsInner,
  ProjectsService,
} from '@sentinel/api';
import { PageHeaderComponent } from '@sentinel/layouts';

@Component({
  selector: 'app-project-list',
  imports: [
    CommonModule,
    RouterModule,
    HlmButton,
    HlmIcon,
    PageHeaderComponent,
  ],
  providers: [ProjectsService],
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss'],
})
export class ProjectListComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  projects: ApiV1ProjectsGet200ResponseDataProjectsInner[] = [];

  private projectsService = inject(ProjectsService);

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
