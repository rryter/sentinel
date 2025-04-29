import { Route } from '@angular/router';
import { ProjectListComponent } from 'libs/sentinel/projects/src/lib/components/project-list/project-list.component';
import { GitHubCallbackComponent } from './auth/github-callback/github-callback.component';

export const appRoutes: Route[] = [
  {
    path: 'auth/github/callback',
    component: GitHubCallbackComponent,
  },
  {
    path: 'projects',
    component: ProjectListComponent,
  },
  {
    path: 'projects/:projectId',
    children: [
      {
        path: 'linting',
        loadChildren: () =>
          import('@sentinel/linting').then((m) => m.lintingRoutes),
      },
      {
        path: 'builds',
        loadChildren: () =>
          import('@sentinel/build').then((m) => m.buildRoutes),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('@sentinel/settings').then((m) => m.settingsRoutes),
      },
    ],
  },
  {
    path: '',
    redirectTo: '/projects',
    pathMatch: 'full',
  },
];
