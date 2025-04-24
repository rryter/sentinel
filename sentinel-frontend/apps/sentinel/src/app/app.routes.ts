import { Route } from '@angular/router';
import { ProjectListComponent } from '../../../../libs/sentinel/projects/src/lib/components/project-list/project-list.component';
import { ProjectDetailComponent } from '../../../../libs/sentinel/projects/src/lib/components/project-detail/project-detail.component';
import { ProjectCreateComponent } from '../../../../libs/sentinel/projects/src/lib/components/project-create/project-create.component';
import { BuildListComponent } from '../../../../libs/sentinel/build/src/lib/build/components/build-list/build-list.component';
import { GitHubCallbackComponent } from './auth/github-callback/github-callback.component';
import { BuildMetricsComponent } from '../../../../libs/sentinel/build/src/lib/containers/build-metrics/build-metrics.component';

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
    loadChildren: () =>
      import('@sentinel/projects').then((m) => m.projectsRoutes),
  },
  {
    path: 'builds',
    loadChildren: () => import('@sentinel/build').then((m) => m.buildRoutes),
  },
  {
    path: 'settings',
    loadChildren: () =>
      import('@sentinel/settings').then((m) => m.settingsRoutes),
  },
  {
    path: '',
    redirectTo: '/linting',
    pathMatch: 'full',
  },
];
