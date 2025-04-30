import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../services/auth/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return authService.getCurrentUserRole().pipe(
    map((role) => {
      if (role === 'admin') {
        return true;
      }

      router.navigate(['/']);
      return false;
    }),
  );
};
