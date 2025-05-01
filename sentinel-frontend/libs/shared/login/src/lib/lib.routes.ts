import { Route } from '@angular/router';

export const loginRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'registration',
    loadComponent: () =>
      import('./registration/registration.component').then(
        (m) => m.RegistrationComponent,
      ),
  },
];
