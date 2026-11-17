import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { ApiService } from '../../core/services/api.service';
import { AuthStore } from '../../core/services/auth.store';
import { ThemeService } from '../../core/services/theme.service';
import { ThemeCustomizerDrawerComponent } from '../../shared/components/theme-customizer-drawer.component';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule,
    ThemeCustomizerDrawerComponent,
  ],
  template: `
    <div class="login-page">
      <div class="login-toolbar">
        <p-button
          [icon]="themeService.config().darkMode ? 'pi pi-sun' : 'pi pi-moon'"
          severity="secondary"
          [text]="true"
          (onClick)="themeService.setDarkMode(!themeService.config().darkMode)"
        />
        <p-button
          label="Personalizar Paleta"
          icon="pi pi-palette"
          severity="secondary"
          [outlined]="true"
          size="small"
          (onClick)="themeOpen.set(true)"
        />
      </div>

      <div class="cemcop-card login-card">
        <div class="login-header">
          <div class="login-badge">CEMCOP</div>
          <h1>Sistema de Entrega de Obsequios</h1>
          <p class="cemcop-muted">Ingrese con su usuario corporativo asignado</p>
        </div>

        @if (errorMsg()) {
          <p-message severity="error" styleClass="mb-2">{{ errorMsg() }}</p-message>
        }

        <form class="cemcop-stack" (ngSubmit)="submit()">
          <div>
            <label class="cemcop-label" for="username">Usuario</label>
            <input
              pInputText
              id="username"
              name="username"
              [(ngModel)]="username"
              autocomplete="username"
              placeholder="ej. repartidor.cali"
              class="w-full"
              required
            />
          </div>

          <div>
            <label class="cemcop-label" for="password">Contraseña</label>
            <p-password
              inputId="password"
              name="password"
              [(ngModel)]="password"
              [feedback]="false"
              [toggleMask]="true"
              styleClass="w-full"
              inputStyleClass="w-full"
              autocomplete="current-password"
              required
            />
          </div>

          <p-button
            type="submit"
            label="Ingresar al Sistema"
            icon="pi pi-sign-in"
            styleClass="w-full mt-1"
            [loading]="loading()"
          />
        </form>
      </div>
    </div>

    <app-theme-customizer-drawer [(visible)]="themeOpen" />
  `,
  styles: `
    .login-page {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      position: relative;
    }
    .login-toolbar {
      position: absolute;
      top: 1rem;
      right: 1rem;
      display: flex;
      gap: 0.5rem;
    }
    .login-card {
      width: 100%;
      max-width: 420px;
    }
    .login-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .login-badge {
      display: inline-block;
      padding: 0.35rem 0.9rem;
      border-radius: 999px;
      background: var(--cemcop-primary);
      color: var(--cemcop-primary-contrast);
      font-weight: 700;
      letter-spacing: 0.05em;
      font-size: 0.85rem;
      margin-bottom: 0.75rem;
    }
    h1 {
      margin: 0 0 0.35rem;
      font-size: 1.4rem;
    }
  `,
})
export class LoginComponent {
  private readonly api = inject(ApiService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  readonly themeService = inject(ThemeService);

  username = '';
  password = '';
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly themeOpen = signal(false);

  submit(): void {
    if (!this.username.trim() || !this.password) return;
    this.loading.set(true);
    this.errorMsg.set(null);

    this.api.login(this.username.trim(), this.password).subscribe({
      next: (res) => {
        this.authStore.setSession(res.access_token, res.usuario, res.debe_cambiar_clave);
        this.loading.set(false);

        if (res.debe_cambiar_clave) {
          void this.router.navigate(['/cambiar-clave-inicial']);
          return;
        }

        if (res.usuario.rol === 'REPARTIDOR') {
          void this.router.navigate(['/entregar']);
        } else {
          void this.router.navigate(['/campanas']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.error?.message ?? 'No fue posible iniciar sesión.';
        this.errorMsg.set(msg);
      },
    });
  }
}

