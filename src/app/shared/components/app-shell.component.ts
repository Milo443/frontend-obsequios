import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { ApiService } from '../../core/services/api.service';
import { AuthStore } from '../../core/services/auth.store';
import { ThemeService } from '../../core/services/theme.service';
import { ThemeCustomizerDrawerComponent } from './theme-customizer-drawer.component';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ButtonModule,
    DrawerModule,
    TagModule,
    MessageModule,
    ThemeCustomizerDrawerComponent,
  ],
  template: `
    <div class="shell-layout">
      <!-- Sidebar fijo en Desktop (>= 992px) -->
      <aside class="desktop-sidebar">
        <div class="brand-box">
          <div class="brand-logo">C</div>
          <div>
            <strong>CEMCOP</strong>
            <small>Entrega de Obsequios</small>
          </div>
        </div>

        <nav class="nav-list">
          @for (item of navItems(); track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="active-link"
              class="nav-item"
            >
              <i [class]="item.icon"></i>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <div class="user-card">
            <strong>{{ authStore.user()?.nombre }}</strong>
            <small>{{ authStore.user()?.rol }} · {{ authStore.user()?.sede?.nombre ?? 'Todas las sedes' }}</small>
          </div>
          <p-button
            label="Cerrar Sesión"
            icon="pi pi-sign-out"
            severity="secondary"
            [outlined]="true"
            styleClass="w-full"
            (onClick)="logout()"
          />
        </div>
      </aside>

      <!-- Drawer móvil / tablet (< 992px) -->
      <p-drawer [(visible)]="mobileMenuOpen" header="CEMCOP · Menú" [style]="{ width: '280px' }">
        <nav class="nav-list">
          @for (item of navItems(); track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="active-link"
              class="nav-item"
              (click)="mobileMenuOpen.set(false)"
            >
              <i [class]="item.icon"></i>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>
        <div class="mt-2">
          <p-button
            label="Cerrar Sesión"
            icon="pi pi-sign-out"
            severity="secondary"
            [outlined]="true"
            styleClass="w-full"
            (onClick)="logout()"
          />
        </div>
      </p-drawer>

      <!-- Área principal -->
      <div class="main-area">
        <header class="topbar">
          <div class="cemcop-flex-row">
            <span class="mobile-only-btn">
              <p-button
                icon="pi pi-bars"
                severity="secondary"
                [text]="true"
                aria-label="Abrir menú"
                (onClick)="mobileMenuOpen.set(true)"
              />
            </span>
            @if (authStore.activeCampaign(); as camp) {
              <p-tag
                [severity]="camp.estado === 'CERRADA' ? 'danger' : 'success'"
                [value]="camp.titulo + ' (' + camp.estado + ')'"
              />
            }
          </div>

          <div class="cemcop-flex-row">
            <p-button
              [icon]="themeService.config().darkMode ? 'pi pi-sun' : 'pi pi-moon'"
              severity="secondary"
              [text]="true"
              [attr.aria-label]="'Alternar modo oscuro'"
              (onClick)="themeService.setDarkMode(!themeService.config().darkMode)"
            />
            <p-button
              label="Paleta"
              icon="pi pi-palette"
              severity="secondary"
              [outlined]="true"
              size="small"
              (onClick)="themeDrawerOpen.set(true)"
            />
          </div>
        </header>

        @if (authStore.isCampaignClosed()) {
          <div class="cemcop-container" style="padding-bottom: 0">
            <p-message severity="warn">
              <strong>Campaña Cerrada (Modo Solo Lectura):</strong> No se permiten nuevas entregas,
              anulaciones ni cambios en padrón. Solo consultas y generación de reportes.
            </p-message>
          </div>
        }

        <main class="cemcop-container">
          <router-outlet />
        </main>
      </div>
    </div>

    <app-theme-customizer-drawer [(visible)]="themeDrawerOpen" />
  `,
  styles: `
    .shell-layout {
      display: flex;
      min-height: 100dvh;
    }
    .desktop-sidebar {
      display: none;
    }
    @media (min-width: 992px) {
      .desktop-sidebar {
        display: flex;
        flex-direction: column;
        width: var(--cemcop-sidebar-width);
        flex-shrink: 0;
        background: var(--cemcop-surface);
        border-right: 1px solid var(--cemcop-border);
        padding: 1.25rem 1rem;
        position: sticky;
        top: 0;
        height: 100dvh;
      }
      .mobile-only-btn {
        display: none !important;
      }
    }
    .brand-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--cemcop-border);
      margin-bottom: 1rem;
    }
    .brand-logo {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: var(--cemcop-radius);
      background: var(--cemcop-primary);
      color: var(--cemcop-primary-contrast);
      display: grid;
      place-items: center;
      font-weight: 800;
      font-size: 1.25rem;
    }
    .brand-box small {
      display: block;
      color: var(--cemcop-text-muted);
      font-size: 0.75rem;
    }
    .nav-list {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      flex: 1;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 0.9rem;
      border-radius: var(--cemcop-radius);
      text-decoration: none;
      color: var(--cemcop-text);
      font-weight: 500;
      min-height: 2.75rem;
      transition: background 0.15s ease;
    }
    .nav-item:hover {
      background: var(--cemcop-surface-alt);
    }
    .nav-item.active-link {
      background: var(--cemcop-primary);
      color: var(--cemcop-primary-contrast);
    }
    .sidebar-footer {
      padding-top: 1rem;
      border-top: 1px solid var(--cemcop-border);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .user-card {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .user-card small {
      color: var(--cemcop-text-muted);
      font-size: 0.78rem;
    }
    .main-area {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .topbar {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.75rem clamp(0.75rem, 2vw, 1.5rem);
      background: var(--cemcop-surface);
      border-bottom: 1px solid var(--cemcop-border);
    }
  `,
})
export class AppShellComponent {
  readonly authStore = inject(AuthStore);
  readonly themeService = inject(ThemeService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly mobileMenuOpen = signal(false);
  readonly themeDrawerOpen = signal(false);

  readonly navItems = computed<NavItem[]>(() => {
    const role = this.authStore.role();
    if (role === 'REPARTIDOR') {
      return [{ label: 'Entregar Obsequio', icon: 'pi pi-gift', route: '/entregar' }];
    }
    const items: NavItem[] = [
      { label: 'Campañas e Importación', icon: 'pi pi-sliders-h', route: '/campanas' },
      { label: 'Padrón de Asociados', icon: 'pi pi-users', route: '/asociados' },
      { label: 'Entregas y Anulaciones', icon: 'pi pi-list-check', route: '/entregas-admin' },
      { label: 'Control Diario y Reportes', icon: 'pi pi-file-excel', route: '/reportes' },
    ];
    if (role === 'SUPER_ADMIN') {
      items.push({ label: 'Gobierno y Auditoría', icon: 'pi pi-shield', route: '/gobierno' });
    }
    return items;
  });

  logout(): void {
    this.api.logout().subscribe({
      next: () => {
        this.authStore.clearLocalSession();
        void this.router.navigate(['/login']);
      },
      error: () => {
        this.authStore.clearLocalSession();
        void this.router.navigate(['/login']);
      },
    });
  }
}
