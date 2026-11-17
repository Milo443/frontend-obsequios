import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { ApiService } from '../../core/services/api.service';
import { AuthStore } from '../../core/services/auth.store';

@Component({
  selector: 'app-cambiar-clave-inicial',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PasswordModule, ButtonModule, MessageModule],
  template: `
    <div class="center-page">
      <div class="cemcop-card card-box">
        <h2 style="margin-top: 0">Cambio Obligatorio de Contraseña</h2>
        <p class="cemcop-muted">
          Por seguridad, debe actualizar su contraseña temporal antes de continuar.
        </p>

        @if (errorMsg()) {
          <p-message severity="error" styleClass="mb-2">{{ errorMsg() }}</p-message>
        }

        <form class="cemcop-stack" (ngSubmit)="submit()">
          <div>
            <label class="cemcop-label">Contraseña Temporal Actual</label>
            <p-password
              [(ngModel)]="passwordActual"
              name="passwordActual"
              [feedback]="false"
              [toggleMask]="true"
              styleClass="w-full"
              inputStyleClass="w-full"
              required
            />
          </div>

          <div>
            <label class="cemcop-label">Nueva Contraseña (mínimo 8 caracteres)</label>
            <p-password
              [(ngModel)]="passwordNueva"
              name="passwordNueva"
              [toggleMask]="true"
              styleClass="w-full"
              inputStyleClass="w-full"
              required
            />
          </div>

          <div>
            <label class="cemcop-label">Confirmar Nueva Contraseña</label>
            <p-password
              [(ngModel)]="confirmar"
              name="confirmar"
              [feedback]="false"
              [toggleMask]="true"
              styleClass="w-full"
              inputStyleClass="w-full"
              required
            />
          </div>

          <p-button
            type="submit"
            label="Guardar y Continuar"
            icon="pi pi-check"
            styleClass="w-full"
            [loading]="loading()"
          />
        </form>
      </div>
    </div>
  `,
  styles: `
    .center-page {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 1rem;
    }
    .card-box {
      width: 100%;
      max-width: 440px;
    }
  `,
})
export class CambiarClaveInicialComponent {
  private readonly api = inject(ApiService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);

  passwordActual = '';
  passwordNueva = '';
  confirmar = '';
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);

  submit(): void {
    if (this.passwordNueva.length < 8) {
      this.errorMsg.set('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (this.passwordNueva !== this.confirmar) {
      this.errorMsg.set('Las contraseñas no coinciden.');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    this.api.cambiarClaveInicial(this.passwordActual, this.passwordNueva).subscribe({
      next: (res) => {
        this.authStore.updateToken(res.access_token, false);
        this.loading.set(false);
        this.messages.add({
          severity: 'success',
          summary: 'Contraseña actualizada',
          detail: 'Ya puede operar normalmente.',
        });
        const target = this.authStore.role() === 'REPARTIDOR' ? '/entregar' : '/campanas';
        void this.router.navigate([target]);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.error?.message ?? 'Error al actualizar la contraseña.');
      },
    });
  }
}

