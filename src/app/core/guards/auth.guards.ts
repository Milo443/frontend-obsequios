import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import type { UserRole } from '../models/api.models';
import { ApiService } from '../services/api.service';
import { AuthStore } from '../services/auth.store';

export const authGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const api = inject(ApiService);
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    return true;
  }

  return api.refresh().pipe(
    switchMap((res) => {
      authStore.updateToken(res.access_token, res.debe_cambiar_clave, false);
      return api.me();
    }),
    map((meRes) => {
      authStore.setUserAndCampaign(meRes.usuario, meRes.campana_activa);
      return true;
    }),
    catchError(() => {
      authStore.clearLocalSession(false);
      void router.navigate(['/login']);
      return of(false);
    }),
  );
};

export const initialPasswordGuard: CanActivateFn = (_route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.mustChangePassword() && state.url !== '/cambiar-clave-inicial') {
    void router.navigate(['/cambiar-clave-inicial']);
    return false;
  }
  return true;
};

export function roleGuard(allowedRoles: UserRole[]): CanActivateFn {
  return () => {
    const authStore = inject(AuthStore);
    const router = inject(Router);
    const role = authStore.role();

    if (role && allowedRoles.includes(role)) {
      return true;
    }

    if (role === 'REPARTIDOR') {
      void router.navigate(['/entregar']);
    } else if (role === 'ADMINISTRADOR' || role === 'SUPER_ADMIN') {
      void router.navigate(['/campanas']);
    } else {
      void router.navigate(['/login']);
    }
    return false;
  };
}
