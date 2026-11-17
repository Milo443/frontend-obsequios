import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { ApiService } from '../services/api.service';
import { AuthStore } from '../services/auth.store';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const api = inject(ApiService);
  const router = inject(Router);

  const isApiUrl = req.url.startsWith('/api/v1');
  const isAuthPublic =
    req.url.includes('/api/v1/auth/login') || req.url.includes('/api/v1/auth/refresh');

  let authReq = req;
  const token = authStore.accessToken();

  if (isApiUrl && !isAuthPublic && token) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(authReq).pipe(
    catchError((err: unknown) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        isApiUrl &&
        !isAuthPublic
      ) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return api.refresh().pipe(
            switchMap((res) => {
              isRefreshing = false;
              authStore.updateToken(res.access_token, res.debe_cambiar_clave);
              refreshTokenSubject.next(res.access_token);
              return next(
                req.clone({
                  setHeaders: { Authorization: `Bearer ${res.access_token}` },
                }),
              );
            }),
            catchError((refreshErr) => {
              isRefreshing = false;
              authStore.clearLocalSession();
              void router.navigate(['/login']);
              return throwError(() => refreshErr);
            }),
          );
        }

        return refreshTokenSubject.pipe(
          filter((newToken): newToken is string => newToken !== null),
          take(1),
          switchMap((newToken) =>
            next(
              req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` },
              }),
            ),
          ),
        );
      }

      return throwError(() => err);
    }),
  );
};

