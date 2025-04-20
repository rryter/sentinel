import { Route } from '@angular/router';
import { ProjectListComponent } from './projects/components/project-list/project-list.component';
import { ProjectDetailComponent } from './projects/components/project-detail/project-detail.component';
import { ProjectCreateComponent } from './projects/components/project-create/project-create.component';
import { BuildListComponent } from './builds/components/build-list/build-list.component';
import { GitHubCallbackComponent } from './auth/github-callback/github-callback.component';
import { PersonFormComponent } from '@sentinel/linting';
export const appRoutes: Route[] = [
  {
    path: 'auth/github/callback',
    component: GitHubCallbackComponent,
  },
  {
    path: 'linting',
    loadChildren: () =>
      import('@sentinel/linting').then((m) => m.lintingRoutes),
  },
  {
    path: 'projects',
    component: ProjectListComponent,
  },
  {
    path: 'projects/create',
    component: ProjectCreateComponent,
  },
  {
    path: 'projects/:id',
    component: ProjectDetailComponent,
  },
  {
    path: 'person',
    component: PersonFormComponent,
  },
  {
    path: 'builds',
    component: BuildListComponent,
  },
];
