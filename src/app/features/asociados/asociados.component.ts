import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import type { AsociadoAuditoriaItem, AsociadoBusqueda } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { AuthStore } from '../../core/services/auth.store';
import { parseScannerOrSearchInput } from '../../core/utils/pdf417-parser';

@Component({
  selector: 'app-asociados',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    TableModule,
    TagModule,
    DialogModule,
    ToggleSwitchModule,
    MessageModule,
  ],
  template: `
    <div class="cemcop-stack">
      <div class="cemcop-card">
        <div class="cemcop-flex-between mb-2">
          <div>
            <h2 style="margin: 0">Padrón de Asociados y Trazabilidad</h2>
            <small class="cemcop-muted">Consulte, enriquezca o audite cambios campo por campo</small>
          </div>
          <p-button
            label="Nuevo Asociado"
            icon="pi pi-user-plus"
            [disabled]="authStore.isCampaignClosed()"
            (onClick)="abrirNuevo()"
          />
        </div>

        <div class="cemcop-flex-row mb-2">
          <input
            pInputText
            [(ngModel)]="query"
            (keydown.enter)="buscar()"
            placeholder="Buscar por cédula o nombre (mín. 3 letras)..."
            style="flex: 1; min-width: 240px"
          />
          <p-button label="Buscar" icon="pi pi-search" (onClick)="buscar()" [loading]="loading()" />
        </div>

        <p-table [value]="resultados()" responsiveLayout="stack" breakpoint="768px">
          <ng-template #header>
            <tr>
              <th>Cédula</th>
              <th>Nombre Completo</th>
              <th>Dirección / Email</th>
              <th>Estado Entrega</th>
              <th>Acciones</th>
            </tr>
          </ng-template>
          <ng-template #body let-row>
            <tr>
              <td><strong>{{ row.cedula }}</strong></td>
              <td>{{ row.nombre_completo }}</td>
              <td>
                <div>{{ row.direccion || 'Sin dirección' }}</div>
                <small class="cemcop-muted">{{ row.email || 'Sin correo' }}</small>
              </td>
              <td>
                <p-tag
                  [severity]="row.estado_entrega === 'ENTREGADO' ? 'success' : 'warn'"
                  [value]="row.estado_entrega"
                />
              </td>
              <td>
                <div class="cemcop-flex-row">
                  <p-button
                    label="Editar"
                    icon="pi pi-pencil"
                    size="small"
                    severity="secondary"
                    [disabled]="authStore.isCampaignClosed()"
                    (onClick)="abrirEdicionParcial(row)"
                  />
                  @if (authStore.role() === 'SUPER_ADMIN') {
                    <p-button
                      label="Maestro"
                      icon="pi pi-key"
                      size="small"
                      severity="warn"
                      [disabled]="authStore.isCampaignClosed()"
                      (onClick)="abrirEdicionMaestra(row)"
                    />
                  }
                  <p-button
                    label="Historial"
                    icon="pi pi-history"
                    size="small"
                    [outlined]="true"
                    (onClick)="verHistorial(row)"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>

    <!-- Modal Crear Asociado (RF-04) -->
    <p-dialog
      [(visible)]="modalCreateOpen"
      [modal]="true"
      header="Registrar Nuevo Asociado en Caliente"
      [style]="{ width: '500px' }"
      [breakpoints]="{ '640px': '95vw' }"
    >
      <div class="cemcop-stack">
        <div>
          <label class="cemcop-label">Cédula *</label>
          <input pInputText class="w-full" [(ngModel)]="createForm.cedula" />
        </div>
        <div>
          <label class="cemcop-label">Nombre Completo *</label>
          <input pInputText class="w-full" [(ngModel)]="createForm.nombre_completo" />
        </div>
        <div>
          <label class="cemcop-label">Correo Electrónico (Opcional)</label>
          <input pInputText class="w-full" [(ngModel)]="createForm.email" />
        </div>
        <div>
          <label class="cemcop-label">Dirección</label>
          <input pInputText class="w-full" [(ngModel)]="createForm.direccion" />
        </div>
        <div>
          <label class="cemcop-label">Observación</label>
          <textarea pTextarea rows="2" class="w-full" [(ngModel)]="createForm.observacion"></textarea>
        </div>
        <div class="cemcop-flex-row" style="justify-content: flex-end">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="modalCreateOpen = false" />
          <p-button label="Guardar" icon="pi pi-save" (onClick)="guardarNuevo()" />
        </div>
      </div>
    </p-dialog>

    <!-- Modal Edición Parcial Admin (RF-05 / HU-04: Cédula y Nombre solo lectura) -->
    <p-dialog
      [(visible)]="modalPatchOpen"
      [modal]="true"
      header="Enriquecimiento de Ficha (Datos Legales Bloqueados)"
      [style]="{ width: '500px' }"
      [breakpoints]="{ '640px': '95vw' }"
    >
      <div class="cemcop-stack">
        <p-message severity="info">
          Por seguridad forense, Cédula y Nombre están bloqueados en solo lectura.
        </p-message>
        <div>
          <label class="cemcop-label">Cédula (Solo Lectura)</label>
          <input pInputText class="w-full" [ngModel]="patchTarget?.cedula" [disabled]="true" />
        </div>
        <div>
          <label class="cemcop-label">Nombre Completo (Solo Lectura)</label>
          <input pInputText class="w-full" [ngModel]="patchTarget?.nombre_completo" [disabled]="true" />
        </div>
        <div>
          <label class="cemcop-label">Correo Electrónico</label>
          <input pInputText class="w-full" [(ngModel)]="patchForm.email" />
        </div>
        <div>
          <label class="cemcop-label">Dirección</label>
          <input pInputText class="w-full" [(ngModel)]="patchForm.direccion" />
        </div>
        <div>
          <label class="cemcop-label">Observación</label>
          <textarea pTextarea rows="3" class="w-full" [(ngModel)]="patchForm.observacion"></textarea>
        </div>
        <div class="cemcop-flex-row" style="justify-content: flex-end">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="modalPatchOpen = false" />
          <p-button label="Actualizar" icon="pi pi-save" (onClick)="guardarParcial()" />
        </div>
      </div>
    </p-dialog>

    <!-- Modal Edición Maestra Super Admin (RF-06 / HU-05) -->
    <p-dialog
      [(visible)]="modalMaestroOpen"
      [modal]="true"
      header="Edición Maestra (Super Admin)"
      [style]="{ width: '540px' }"
      [breakpoints]="{ '640px': '95vw' }"
    >
      <div class="cemcop-stack">
        <div>
          <label class="cemcop-label">Cédula *</label>
          <input pInputText class="w-full" [(ngModel)]="maestroForm.cedula" />
        </div>
        <div>
          <label class="cemcop-label">Nombre Completo *</label>
          <input pInputText class="w-full" [(ngModel)]="maestroForm.nombre_completo" />
        </div>
        <div>
          <label class="cemcop-label">Email</label>
          <input pInputText class="w-full" [(ngModel)]="maestroForm.email" />
        </div>
        <div>
          <label class="cemcop-label">Dirección</label>
          <input pInputText class="w-full" [(ngModel)]="maestroForm.direccion" />
        </div>
        <div>
          <label class="cemcop-label">Observación</label>
          <textarea pTextarea rows="2" class="w-full" [(ngModel)]="maestroForm.observacion"></textarea>
        </div>
        <div class="cemcop-flex-between">
          <span class="cemcop-label" style="margin: 0">Asociado Activo</span>
          <p-toggleswitch [(ngModel)]="maestroForm.activo" />
        </div>
        <div>
          <label class="cemcop-label">Motivo de Edición Maestra * (mínimo 15 caracteres)</label>
          <textarea
            pTextarea
            rows="2"
            class="w-full"
            [(ngModel)]="maestroForm.motivo"
            placeholder="Describa el soporte físico o razón de corrección..."
          ></textarea>
        </div>
        <div class="cemcop-flex-row" style="justify-content: flex-end">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="modalMaestroOpen = false" />
          <p-button
            label="Guardar Cambios Maestros"
            severity="warn"
            icon="pi pi-check"
            [disabled]="maestroForm.motivo.trim().length < 15"
            (onClick)="guardarMaestro()"
          />
        </div>
      </div>
    </p-dialog>

    <!-- Modal Historial Campo por Campo (RF-07) -->
    <p-dialog
      [(visible)]="modalAuditOpen"
      [modal]="true"
      [header]="'Trazabilidad de Cambios · ' + (auditTargetName() ?? '')"
      [style]="{ width: '820px' }"
      [breakpoints]="{ '960px': '85vw', '640px': '95vw' }"
    >
      <p-table [value]="auditoria()" responsiveLayout="stack" breakpoint="640px">
        <ng-template #header>
          <tr>
            <th>Fecha</th>
            <th>Usuario / Rol</th>
            <th>Acción / Campo</th>
            <th>Valor Anterior</th>
            <th>Valor Nuevo</th>
            <th>Motivo / IP</th>
          </tr>
        </ng-template>
        <ng-template #body let-h>
          <tr>
            <td>{{ h.fecha_cambio }}</td>
            <td>{{ h.usuario_nombre }} ({{ h.rol_usuario }})</td>
            <td><strong>{{ h.accion }}</strong> · {{ h.campo_modificado }}</td>
            <td>{{ h.valor_anterior ?? '—' }}</td>
            <td>{{ h.valor_nuevo ?? '—' }}</td>
            <td>
              <div>{{ h.motivo ?? '—' }}</div>
              <small class="cemcop-muted">{{ h.ip_origen }}</small>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </p-dialog>
  `,
})
export class AsociadosComponent implements OnInit {
  readonly authStore = inject(AuthStore);
  private readonly api = inject(ApiService);
  private readonly messages = inject(MessageService);

  query = '';
  readonly loading = signal(false);
  readonly resultados = signal<AsociadoBusqueda[]>([]);
  readonly auditoria = signal<AsociadoAuditoriaItem[]>([]);
  readonly auditTargetName = signal<string | null>(null);

  modalCreateOpen = false;
  createForm = { cedula: '', nombre_completo: '', email: '', direccion: '', observacion: '' };

  modalPatchOpen = false;
  patchTarget: AsociadoBusqueda | null = null;
  patchForm = { email: '', direccion: '', observacion: '' };

  modalMaestroOpen = false;
  maestroTarget: AsociadoBusqueda | null = null;
  maestroForm = {
    cedula: '',
    nombre_completo: '',
    email: '',
    direccion: '',
    observacion: '',
    activo: true,
    motivo: '',
  };

  modalAuditOpen = false;

  ngOnInit(): void {
    this.api.getActividadActiva().subscribe({
      next: (act) => this.authStore.setActiveCampaign({ id: act.id, titulo: act.titulo, estado: act.estado }),
    });
  }

  buscar(): void {
    const clean = parseScannerOrSearchInput(this.query);
    if (!clean) return;
    this.loading.set(true);
    this.api.buscarAsociados(clean, this.authStore.activeCampaign()?.id, 25).subscribe({
      next: (res) => {
        this.resultados.set(res.resultados);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  abrirNuevo(): void {
    this.createForm = { cedula: '', nombre_completo: '', email: '', direccion: '', observacion: '' };
    this.modalCreateOpen = true;
  }

  guardarNuevo(): void {
    this.api
      .createAsociado({
        cedula: this.createForm.cedula,
        nombre_completo: this.createForm.nombre_completo,
        email: this.createForm.email || null,
        direccion: this.createForm.direccion || null,
        observacion: this.createForm.observacion || null,
        actividad_id: this.authStore.activeCampaign()?.id,
      })
      .subscribe({
        next: () => {
          this.modalCreateOpen = false;
          this.messages.add({ severity: 'success', summary: 'Asociado creado', detail: 'Registro agregado al censo.' });
          this.query = this.createForm.cedula;
          this.buscar();
        },
      });
  }

  abrirEdicionParcial(row: AsociadoBusqueda): void {
    this.patchTarget = row;
    this.patchForm = {
      email: row.email ?? '',
      direccion: row.direccion ?? '',
      observacion: row.observacion ?? '',
    };
    this.modalPatchOpen = true;
  }

  guardarParcial(): void {
    if (!this.patchTarget) return;
    this.api
      .patchAsociado(this.patchTarget.id, {
        email: this.patchForm.email || null,
        direccion: this.patchForm.direccion || null,
        observacion: this.patchForm.observacion || null,
      })
      .subscribe({
        next: () => {
          this.modalPatchOpen = false;
          this.messages.add({ severity: 'success', summary: 'Actualizado', detail: 'Ficha enriquecida y auditada.' });
          this.buscar();
        },
      });
  }

  abrirEdicionMaestra(row: AsociadoBusqueda): void {
    this.maestroTarget = row;
    this.maestroForm = {
      cedula: row.cedula,
      nombre_completo: row.nombre_completo,
      email: row.email ?? '',
      direccion: row.direccion ?? '',
      observacion: row.observacion ?? '',
      activo: row.activo,
      motivo: '',
    };
    this.modalMaestroOpen = true;
  }

  guardarMaestro(): void {
    if (!this.maestroTarget) return;
    this.api
      .updateAsociadoMaestro(this.maestroTarget.id, {
        cedula: this.maestroForm.cedula,
        nombre_completo: this.maestroForm.nombre_completo,
        email: this.maestroForm.email || null,
        direccion: this.maestroForm.direccion || null,
        fecha_ult_act: this.maestroTarget.fecha_ult_act,
        observacion: this.maestroForm.observacion || null,
        activo: this.maestroForm.activo,
        motivo: this.maestroForm.motivo.trim(),
      })
      .subscribe({
        next: () => {
          this.modalMaestroOpen = false;
          this.messages.add({ severity: 'success', summary: 'Edición Maestra', detail: 'Cambios persistidos en bitácora.' });
          this.buscar();
        },
      });
  }

  verHistorial(row: AsociadoBusqueda): void {
    this.auditTargetName.set(`${row.nombre_completo} (${row.cedula})`);
    this.api.getAsociadoAuditoria(row.id).subscribe({
      next: (res) => {
        this.auditoria.set(res.historial);
        this.modalAuditOpen = true;
      },
    });
  }
}

