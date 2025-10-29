import { Route } from '@angular/router';
import { MainLayoutComponent } from '@sentinel/layouts';
import { GitHubCallbackComponent } from './auth/github-callback/github-callback.component';
import { LoginComponent } from './auth/login/login.component';
import { RegistrationPageComponent } from './auth/registration/registration.component';
export const appRoutes: Route[] = [
  {
    path: 'auth/github/callback',
    component: GitHubCallbackComponent,
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        component: LoginComponent,
      },
      {
        path: 'registration',
        component: RegistrationPageComponent,
      },
    ],
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
