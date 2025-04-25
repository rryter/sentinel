import { Route } from '@angular/router';
import { GitHubCallbackComponent } from './auth/github-callback/github-callback.component';

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
