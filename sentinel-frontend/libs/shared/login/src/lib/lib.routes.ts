import { Route } from '@angular/router';

export const loginRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then((m) => m.LoginComponent),
  },
  //   {
  //     path: 'register',
  //     loadComponent: () =>
  //       import('./pages/register/register.component').then(
  //         (m) => m.RegisterComponent,
  //       ),
  //   },
];
