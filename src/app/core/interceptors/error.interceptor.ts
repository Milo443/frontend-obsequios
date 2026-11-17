import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';
import type { ApiErrorBody } from '../models/api.models';
import { AuthStore } from '../services/auth.store';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);
  const router = inject(Router);
  const authStore = inject(AuthStore);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || !req.url.startsWith('/api/v1')) {
        return throwError(() => err);
      }

      const body = err.error as Partial<ApiErrorBody> | undefined;
      const code = body?.error?.code;
      const msg = body?.error?.message ?? 'Ocurrió un error al comunicarse con el servidor.';

      if (code === 'PASSWORD_CHANGE_REQUIRED') {
        void router.navigate(['/cambiar-clave-inicial']);
      }

      if (code === 'CAMPAIGN_CLOSED') {
        const current = authStore.activeCampaign();
        if (current) {
          authStore.setActiveCampaign({ ...current, estado: 'CERRADA' });
        }
      }

      // Errores con flujo modal propio (ALREADY_DELIVERED, DEFICIT_CONFIRMATION_REQUIRED)
      // no duplican toast aquí salvo los operativos estándar
      const skipToastCodes = new Set([
        'ALREADY_DELIVERED',
        'DEFICIT_CONFIRMATION_REQUIRED',
        'SESSION_EXPIRED',
      ]);

      if (!code || !skipToastCodes.has(code)) {
        messageService.add({
          severity: err.status >= 500 ? 'error' : 'warn',
          summary: err.status >= 500 ? 'Error del sistema' : 'Atención',
          detail: msg,
          life: 5000,
        });
      }

      return throwError(() => err);
    }),
  );
};

