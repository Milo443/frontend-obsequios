import { Routes } from '@angular/router';
import { authGuard, initialPasswordGuard, roleGuard } from './core/guards/auth.guards';
import { AppShellComponent } from './shared/components/app-shell.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'cambiar-clave-inicial',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/cambiar-clave-inicial.component').then(
        (m) => m.CambiarClaveInicialComponent,
      ),
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard, initialPasswordGuard],
    children: [
      {
        path: 'entregar',
        canActivate: [roleGuard(['REPARTIDOR'])],
        loadComponent: () =>
          import('./features/entregar/entregar.component').then((m) => m.EntregarComponent),
      },
      {
        path: 'campanas',
        canActivate: [roleGuard(['ADMINISTRADOR', 'SUPER_ADMIN'])],
        loadComponent: () =>
          import('./features/campanas/campanas.component').then((m) => m.CampanasComponent),
      },
      {
        path: 'asociados',
        canActivate: [roleGuard(['ADMINISTRADOR', 'SUPER_ADMIN'])],
        loadComponent: () =>
          import('./features/asociados/asociados.component').then((m) => m.AsociadosComponent),
      },
      {
        path: 'entregas-admin',
        canActivate: [roleGuard(['ADMINISTRADOR', 'SUPER_ADMIN'])],
        loadComponent: () =>
          import('./features/entregas-admin/entregas-admin.component').then(
            (m) => m.EntregasAdminComponent,
          ),
      },
      {
        path: 'reportes',
        canActivate: [roleGuard(['ADMINISTRADOR', 'SUPER_ADMIN'])],
        loadComponent: () =>
          import('./features/reportes/reportes.component').then((m) => m.ReportesComponent),
      },
      {
        path: 'gobierno',
        canActivate: [roleGuard(['SUPER_ADMIN'])],
        loadComponent: () =>
          import('./features/gobierno/gobierno.component').then((m) => m.GobiernoComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'entregar' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];

