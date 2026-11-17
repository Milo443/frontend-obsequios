import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import type { AuditoriaGlobalLog, Sede, UserRole, UsuarioAdmin } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-gobierno',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TabsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    DialogModule,
  ],
  template: `
    <div class="cemcop-card">
      <h2 style="margin-top: 0">Gobierno, Sedes, Usuarios y Auditoría Forense</h2>

      <p-tabs value="0">
        <p-tablist>
          <p-tab value="0">Sedes Físicas</p-tab>
          <p-tab value="1">Usuarios y Roles</p-tab>
          <p-tab value="2">Auditoría Global (IPs y Accesos)</p-tab>
        </p-tablist>

        <p-tabpanels>
          <!-- Tab 0: Sedes -->
          <p-tabpanel value="0">
            <div class="cemcop-flex-between mb-2 mt-1">
              <span class="cemcop-muted">Puntos físicos autorizados de entrega</span>
              <p-button label="Nueva Sede" icon="pi pi-plus" (onClick)="modalSedeOpen = true" />
            </div>

            <p-table [value]="sedes()" responsiveLayout="stack" breakpoint="640px">
              <ng-template #header>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Ciudad / Dirección</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </ng-template>
              <ng-template #body let-s>
                <tr>
                  <td><strong>{{ s.codigo }}</strong></td>
                  <td>{{ s.nombre }}</td>
                  <td>{{ s.ciudad }} · {{ s.direccion || '—' }}</td>
                  <td>
                    <p-tag [severity]="s.activa ? 'success' : 'danger'" [value]="s.activa ? 'ACTIVA' : 'INACTIVA'" />
                  </td>
                  <td>
                    <p-button
                      [label]="s.activa ? 'Inactivar' : 'Activar'"
                      size="small"
                      [severity]="s.activa ? 'warn' : 'success'"
                      (onClick)="toggleSede(s)"
                    />
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabpanel>

          <!-- Tab 1: Usuarios -->
          <p-tabpanel value="1">
            <div class="cemcop-flex-between mb-2 mt-1">
              <span class="cemcop-muted">Gestión de operadores y administradores</span>
              <p-button label="Nuevo Usuario" icon="pi pi-user-plus" (onClick)="modalUsuarioOpen = true" />
            </div>

            <p-table [value]="usuarios()" responsiveLayout="stack" breakpoint="768px">
              <ng-template #header>
                <tr>
                  <th>Usuario</th>
                  <th>Nombre</th>
                  <th>Rol / Sede</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </ng-template>
              <ng-template #body let-u>
                <tr>
                  <td><strong>{{ u.username }}</strong></td>
                  <td>{{ u.nombre }}</td>
                  <td>{{ u.rol }} · {{ u.sede_nombre || 'Global' }}</td>
                  <td>
                    <p-tag [severity]="u.activo ? 'success' : 'danger'" [value]="u.activo ? 'ACTIVO' : 'BLOQUEADO'" />
                  </td>
                  <td>
                    <div class="cemcop-flex-row">
                      <p-button
                        [label]="u.activo ? 'Bloquear' : 'Habilitar'"
                        size="small"
                        [severity]="u.activo ? 'danger' : 'success'"
                        (onClick)="toggleUsuario(u)"
                      />
                      <p-button
                        label="Reset Clave"
                        icon="pi pi-key"
                        size="small"
                        severity="secondary"
                        (onClick)="abrirResetPassword(u)"
                      />
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabpanel>

          <!-- Tab 2: Auditoría Forense Global -->
          <p-tabpanel value="2">
            <div class="cemcop-flex-row mb-2 mt-1">
              <input pInputText [(ngModel)]="filtroAccion" placeholder="Filtrar acción (ej. LOGIN)" />
              <p-button label="Actualizar" icon="pi pi-refresh" (onClick)="cargarLogs()" />
            </div>
            <p-table [value]="logs()" responsiveLayout="stack" breakpoint="768px">
              <ng-template #header>
                <tr>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Tabla / Registro</th>
                  <th>IP Origen</th>
                </tr>
              </ng-template>
              <ng-template #body let-l>
                <tr>
                  <td>{{ l.created_at }}</td>
                  <td>{{ l.usuario_username || 'Anónimo' }}</td>
                  <td><strong>{{ l.accion }}</strong></td>
                  <td>{{ l.tabla_afectada || '—' }} #{{ l.registro_id || '—' }}</td>
                  <td><code>{{ l.ip_origen }}</code></td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </div>

    <!-- Modal Nueva Sede -->
    <p-dialog [(visible)]="modalSedeOpen" [modal]="true" header="Crear Sede Física" [style]="{ width: '440px' }" [breakpoints]="{ '640px': '95vw' }">
      <div class="cemcop-stack">
        <div>
          <label class="cemcop-label">Código *</label>
          <input pInputText class="w-full" [(ngModel)]="sedeForm.codigo" placeholder="BOG-01" />
        </div>
        <div>
          <label class="cemcop-label">Nombre *</label>
          <input pInputText class="w-full" [(ngModel)]="sedeForm.nombre" />
        </div>
        <div>
          <label class="cemcop-label">Ciudad *</label>
          <input pInputText class="w-full" [(ngModel)]="sedeForm.ciudad" />
        </div>
        <div>
          <label class="cemcop-label">Dirección</label>
          <input pInputText class="w-full" [(ngModel)]="sedeForm.direccion" />
        </div>
        <div class="cemcop-flex-row" style="justify-content: flex-end">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="modalSedeOpen = false" />
          <p-button label="Guardar" icon="pi pi-save" (onClick)="crearSede()" />
        </div>
      </div>
    </p-dialog>

    <!-- Modal Nuevo Usuario -->
    <p-dialog [(visible)]="modalUsuarioOpen" [modal]="true" header="Crear Usuario" [style]="{ width: '460px' }" [breakpoints]="{ '640px': '95vw' }">
      <div class="cemcop-stack">
        <div>
          <label class="cemcop-label">Username *</label>
          <input pInputText class="w-full" [(ngModel)]="userForm.username" />
        </div>
        <div>
          <label class="cemcop-label">Nombre Completo *</label>
          <input pInputText class="w-full" [(ngModel)]="userForm.nombre" />
        </div>
        <div>
          <label class="cemcop-label">Email</label>
          <input pInputText class="w-full" [(ngModel)]="userForm.email" />
        </div>
        <div>
          <label class="cemcop-label">Contraseña Temporal * (mín. 8 chars)</label>
          <input pInputText type="password" class="w-full" [(ngModel)]="userForm.password_temporal" />
        </div>
        <div>
          <label class="cemcop-label">Rol *</label>
          <p-select [options]="rolOptions" [(ngModel)]="userForm.rol" styleClass="w-full" />
        </div>
        <div>
          <label class="cemcop-label">Sede (Obligatoria para REPARTIDOR)</label>
          <p-select
            [options]="sedes()"
            [(ngModel)]="userForm.sede_id"
            optionLabel="nombre"
            optionValue="id"
            [showClear]="true"
            styleClass="w-full"
          />
        </div>
        <div class="cemcop-flex-row" style="justify-content: flex-end">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="modalUsuarioOpen = false" />
          <p-button label="Crear" icon="pi pi-save" (onClick)="crearUsuario()" />
        </div>
      </div>
    </p-dialog>

    <!-- Modal Reset Password -->
    <p-dialog [(visible)]="modalResetOpen" [modal]="true" header="Restablecer Contraseña Temporal" [style]="{ width: '420px' }" [breakpoints]="{ '640px': '95vw' }">
      <div class="cemcop-stack">
        <div>
          <label class="cemcop-label">Nueva Contraseña Temporal (mín. 8 chars)</label>
          <input pInputText type="password" class="w-full" [(ngModel)]="resetPasswordVal" />
        </div>
        <div class="cemcop-flex-row" style="justify-content: flex-end">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="modalResetOpen = false" />
          <p-button label="Restablecer" severity="warn" (onClick)="confirmarResetPassword()" />
        </div>
      </div>
    </p-dialog>
  `,
})
export class GobiernoComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly messages = inject(MessageService);

  readonly sedes = signal<Sede[]>([]);
  readonly usuarios = signal<UsuarioAdmin[]>([]);
  readonly logs = signal<AuditoriaGlobalLog[]>([]);

  modalSedeOpen = false;
  sedeForm = { codigo: '', nombre: '', ciudad: '', direccion: '' };

  modalUsuarioOpen = false;
  readonly rolOptions: UserRole[] = ['REPARTIDOR', 'ADMINISTRADOR', 'SUPER_ADMIN'];
  userForm: {
    username: string;
    nombre: string;
    email: string;
    password_temporal: string;
    rol: UserRole;
    sede_id: number | null;
  } = {
    username: '',
    nombre: '',
    email: '',
    password_temporal: '',
    rol: 'REPARTIDOR',
    sede_id: null,
  };

  modalResetOpen = false;
  resetTargetId: number | null = null;
  resetPasswordVal = '';
  filtroAccion = '';

  ngOnInit(): void {
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.api.getSedes().subscribe({ next: (r) => this.sedes.set(r.sedes) });
    this.api.getUsuarios({ limit: 50 }).subscribe({ next: (r) => this.usuarios.set(r.usuarios) });
    this.cargarLogs();
  }

  cargarLogs(): void {
    this.api.getAuditoriaLogs({ accion: this.filtroAccion || undefined, limit: 50 }).subscribe({
      next: (r) => this.logs.set(r.logs),
    });
  }

  crearSede(): void {
    this.api.createSede(this.sedeForm).subscribe({
      next: () => {
        this.modalSedeOpen = false;
        this.sedeForm = { codigo: '', nombre: '', ciudad: '', direccion: '' };
        this.messages.add({ severity: 'success', summary: 'Sede creada' });
        this.cargarTodo();
      },
    });
  }

  toggleSede(s: Sede): void {
    this.api.toggleSedeEstado(s.id, !s.activa).subscribe({
      next: () => {
        this.messages.add({ severity: 'info', summary: 'Estado de sede actualizado' });
        this.cargarTodo();
      },
    });
  }

  crearUsuario(): void {
    this.api
      .createUsuario({
        username: this.userForm.username,
        nombre: this.userForm.nombre,
        email: this.userForm.email || null,
        password_temporal: this.userForm.password_temporal,
        rol: this.userForm.rol,
        sede_id: this.userForm.sede_id,
      })
      .subscribe({
        next: () => {
          this.modalUsuarioOpen = false;
          this.messages.add({ severity: 'success', summary: 'Usuario creado' });
          this.cargarTodo();
        },
      });
  }

  toggleUsuario(u: UsuarioAdmin): void {
    this.api.toggleUsuarioEstado(u.id, !u.activo).subscribe({
      next: () => {
        this.messages.add({ severity: 'info', summary: 'Estado actualizado y sesiones sincronizadas' });
        this.cargarTodo();
      },
    });
  }

  abrirResetPassword(u: UsuarioAdmin): void {
    this.resetTargetId = u.id;
    this.resetPasswordVal = '';
    this.modalResetOpen = true;
  }

  confirmarResetPassword(): void {
    if (!this.resetTargetId || this.resetPasswordVal.length < 8) return;
    this.api.resetUsuarioPassword(this.resetTargetId, this.resetPasswordVal).subscribe({
      next: () => {
        this.modalResetOpen = false;
        this.messages.add({ severity: 'success', summary: 'Contraseña temporal restablecida' });
      },
    });
  }
}

