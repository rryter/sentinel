import { Route } from '@angular/router';
import { AuthComponentComponent, MainLayoutComponent } from '@sentinel/layouts';
import { GitHubCallbackComponent } from './auth/github-callback/github-callback.component';
export const appRoutes: Route[] = [
  {
    path: 'auth/github/callback',
    component: GitHubCallbackComponent,
  },
  {
    path: 'auth',
    component: AuthComponentComponent,
    loadChildren: () => import('@shared/login').then((m) => m.loginRoutes),
  },
  {
    path: 'projects',
    component: MainLayoutComponent,
    loadChildren: () =>
      import('@sentinel/projects').then((m) => m.projectsRoutes),
  },
  {
    path: 'projects/:projectId',
    component: MainLayoutComponent,
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
  {
    path: 'dev',
    loadComponent: () =>
      import('@shared/ui-custom').then((m) => m.DevelopmentComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('@shared/ui-custom').then((m) => m.NotFound404Component),
  },
];
