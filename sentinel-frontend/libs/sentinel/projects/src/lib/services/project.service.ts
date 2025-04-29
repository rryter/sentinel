import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Project, ProjectsService } from '../services/project';
@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  constructor(private projectsService: ProjectsService) {}

  createProject(
    name: string,
    repositoryUrl: string,
  ): Observable<{ data: { project: Project } }> {
    const requestParams = {
      apiV1ProjectsPostRequest: {
        project: {
          name,
          repository_url: repositoryUrl,
        },
      },
    };

    return this.projectsService.apiV1ProjectsPost(requestParams);
  }

  cloneRepository(
    projectId: number,
  ): Observable<{ message: string; path: string }> {
    return this.projectsService.cloneRepository(projectId);
  }
}
