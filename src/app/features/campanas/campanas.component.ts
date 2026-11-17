import { HttpEventType } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import type {
  Actividad,
  ActividadActiva,
  EvaluacionCobertura,
  ImportacionExcelItem,
} from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { AuthStore } from '../../core/services/auth.store';

@Component({
  selector: 'app-campanas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    MessageModule,
    TableModule,
    TagModule,
    DialogModule,
    ConfirmDialogModule,
    ProgressBarModule,
  ],
  template: `
    <p-confirmdialog />

    <div class="cemcop-stack">
      <!-- KPIs Campaña Activa -->
      @if (activa(); as act) {
        <div class="cemcop-grid cemcop-grid-4">
          <div class="cemcop-card">
            <span class="cemcop-muted">Comprados</span>
            <h2 style="margin: 0.25rem 0 0">{{ act.cantidad_comprada }}</h2>
          </div>
          <div class="cemcop-card">
            <span class="cemcop-muted">Entregados (Hoy: {{ act.entregados_hoy }})</span>
            <h2 style="margin: 0.25rem 0 0">{{ act.total_entregados }}</h2>
          </div>
          <div class="cemcop-card">
            <span class="cemcop-muted">Saldo Disponible</span>
            <h2 style="margin: 0.25rem 0 0">{{ act.saldo_disponible }}</h2>
          </div>
          <div class="cemcop-card">
            <span class="cemcop-muted">Asociados Base Activos</span>
            <h2 style="margin: 0.25rem 0 0">{{ act.asociados_activos_base }}</h2>
          </div>
        </div>
      }

      <!-- Gestión y Parametrización -->
      <div class="cemcop-card">
        <div class="cemcop-flex-between mb-2">
          <h2 style="margin: 0">Campañas de Obsequios</h2>
          <p-button
            label="Nueva Campaña"
            icon="pi pi-plus"
            (onClick)="abrirModalNueva()"
          />
        </div>

        <p-table [value]="actividades()" responsiveLayout="stack" breakpoint="768px">
          <ng-template #header>
            <tr>
              <th>Título</th>
              <th>Estado</th>
              <th>Comprados</th>
              <th>Entregados</th>
              <th>Saldo</th>
              <th>Acciones</th>
            </tr>
          </ng-template>
          <ng-template #body let-row>
            <tr>
              <td><strong>{{ row.titulo }}</strong></td>
              <td>
                <p-tag
                  [severity]="row.estado === 'ACTIVA' ? 'success' : row.estado === 'CERRADA' ? 'danger' : 'info'"
                  [value]="row.estado"
                />
              </td>
              <td>{{ row.cantidad_comprada }}</td>
              <td>{{ row.total_entregados }}</td>
              <td>{{ row.saldo_disponible }}</td>
              <td>
                <div class="cemcop-flex-row">
                  @if (row.estado !== 'CERRADA') {
                    <p-button
                      label="Editar Stock"
                      icon="pi pi-pencil"
                      size="small"
                      severity="secondary"
                      (onClick)="abrirModalEditar(row)"
                    />
                  }
                  @if (row.estado === 'BORRADOR') {
                    <p-button
                      label="Activar"
                      icon="pi pi-play"
                      size="small"
                      (onClick)="activar(row)"
                    />
                  }
                  @if (row.estado === 'ACTIVA' && authStore.role() === 'SUPER_ADMIN') {
                    <p-button
                      label="Cerrar Campaña"
                      icon="pi pi-lock"
                      severity="danger"
                      size="small"
                      (onClick)="abrirCierre(row)"
                    />
                  }
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Carga Masiva de Excel (RF-03) -->
      @if (activa(); as act) {
        <div class="cemcop-card">
          <h3 style="margin-top: 0">Carga Masiva de Padrón de Asociados (Excel .xlsx)</h3>
          <p class="cemcop-muted">
            Columnas requeridas: <code>Cédula</code>, <code>Asociado</code>, <code>Fecha ult. act.</code>,
            <code>Observación</code> (opcionales: <code>Email</code>, <code>Dirección</code>). Conserva
            intactas las entregas ya firmadas.
          </p>

          <div class="cemcop-flex-row">
            <input
              type="file"
              accept=".xlsx"
              [disabled]="act.estado === 'CERRADA' || importing()"
              (change)="onFileSelected($event, act.id)"
            />
          </div>

          @if (uploadProgress() > 0) {
            <div class="mt-2">
              <p-progressbar [value]="uploadProgress()" />
            </div>
          }

          <div class="mt-2">
            <h4>Historial de Importaciones</h4>
            <p-table [value]="importaciones()" responsiveLayout="stack" breakpoint="640px">
              <ng-template #header>
                <tr>
                  <th>Fecha</th>
                  <th>Archivo</th>
                  <th>Usuario</th>
                  <th>Filas</th>
                  <th>Nuevos / Act.</th>
                  <th>Estado</th>
                </tr>
              </ng-template>
              <ng-template #body let-imp>
                <tr>
                  <td>{{ imp.created_at }}</td>
                  <td>{{ imp.nombre_archivo }}</td>
                  <td>{{ imp.usuario_nombre }}</td>
                  <td>{{ imp.total_filas }}</td>
                  <td>{{ imp.total_nuevos }} / {{ imp.total_actualizados }}</td>
                  <td>
                    <p-tag
                      [severity]="imp.estado === 'EXITOSO' ? 'success' : imp.estado === 'FALLIDO' ? 'danger' : 'warn'"
                      [value]="imp.estado"
                    />
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        </div>
      }
    </div>

    <!-- Modal Crear / Editar Campaña con Alerta Predictiva (HU-01) -->
    <p-dialog
      [(visible)]="modalFormOpen"
      [modal]="true"
      [header]="editingId ? 'Editar Campaña y Cobertura' : 'Nueva Campaña (Borrador)'"
      [style]="{ width: '540px' }"
      [breakpoints]="{ '640px': '95vw' }"
    >
      <div class="cemcop-stack">
        @if (cobertura(); as cob) {
          <p-message
            [severity]="cob.tipo_alerta === 'DEFICIT' ? 'warn' : cob.tipo_alerta === 'SUPERAVIT' ? 'info' : 'success'"
          >
            {{ cob.mensaje }}
          </p-message>
        }

        <div>
          <label class="cemcop-label">Título de la Campaña *</label>
          <input pInputText class="w-full" [(ngModel)]="formTitulo" placeholder="Ej. Obsequio de Navidad 2026" />
        </div>

        <div>
          <label class="cemcop-label">Cantidad de Obsequios Comprados *</label>
          <p-inputnumber
            [(ngModel)]="formCantidad"
            (ngModelChange)="evaluarCoberturaEnVivo($event)"
            [min]="0"
            styleClass="w-full"
            inputStyleClass="w-full"
          />
        </div>

        <div>
          <label class="cemcop-label">Fecha de Inicio (YYYY-MM-DD)</label>
          <input pInputText class="w-full" [(ngModel)]="formFechaInicio" placeholder="2026-11-09" />
        </div>

        <div class="cemcop-flex-row" style="justify-content: flex-end">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="modalFormOpen = false" />
          <p-button label="Guardar" icon="pi pi-save" (onClick)="guardarCampana(false)" />
        </div>
      </div>
    </p-dialog>

    <!-- Modal Cierre Definitivo (RF-14) -->
    <p-dialog
      [(visible)]="modalCierreOpen"
      [modal]="true"
      header="Cierre Definitivo de Campaña (Modo Solo Lectura)"
      [style]="{ width: '480px' }"
      [breakpoints]="{ '640px': '95vw' }"
    >
      <div class="cemcop-stack">
        <p-message severity="error">
          Esta acción es irreversible. Congelará entregas, anulaciones e importaciones de la campaña.
        </p-message>
        <div>
          <label class="cemcop-label">Escriba <code>CERRAR_CAMPAÑA</code> para confirmar</label>
          <input pInputText class="w-full" [(ngModel)]="cierreConfirmText" />
        </div>
        <div>
          <label class="cemcop-label">Observación de cierre</label>
          <input pInputText class="w-full" [(ngModel)]="cierreObs" />
        </div>
        <div class="cemcop-flex-row" style="justify-content: flex-end">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="modalCierreOpen = false" />
          <p-button
            label="Ejecutar Cierre"
            severity="danger"
            icon="pi pi-lock"
            [disabled]="cierreConfirmText !== 'CERRAR_CAMPAÑA'"
            (onClick)="confirmarCierre()"
          />
        </div>
      </div>
    </p-dialog>
  `,
})
export class CampanasComponent implements OnInit {
  readonly authStore = inject(AuthStore);
  private readonly api = inject(ApiService);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly actividades = signal<Actividad[]>([]);
  readonly activa = signal<ActividadActiva | null>(null);
  readonly importaciones = signal<ImportacionExcelItem[]>([]);
  readonly cobertura = signal<EvaluacionCobertura | null>(null);
  readonly uploadProgress = signal(0);
  readonly importing = signal(false);

  modalFormOpen = false;
  editingId: number | null = null;
  formTitulo = '';
  formCantidad = 0;
  formFechaInicio = '';

  modalCierreOpen = false;
  closingId: number | null = null;
  cierreConfirmText = '';
  cierreObs = '';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.api.getActividades().subscribe({
      next: (r) => this.actividades.set(r.actividades),
    });
    this.api.getActividadActiva().subscribe({
      next: (act) => {
        this.activa.set(act);
        this.authStore.setActiveCampaign({ id: act.id, titulo: act.titulo, estado: act.estado });
        this.api.getImportaciones(act.id).subscribe({
          next: (imp) => this.importaciones.set(imp.importaciones),
        });
      },
      error: () => this.activa.set(null),
    });
  }

  abrirModalNueva(): void {
    this.editingId = null;
    this.formTitulo = '';
    this.formCantidad = 0;
    this.formFechaInicio = '';
    this.cobertura.set(null);
    this.modalFormOpen = true;
  }

  abrirModalEditar(act: Actividad): void {
    this.editingId = act.id;
    this.formTitulo = act.titulo;
    this.formCantidad = act.cantidad_comprada;
    this.formFechaInicio = act.fecha_inicio ?? '';
    this.cobertura.set(null);
    this.modalFormOpen = true;
    this.evaluarCoberturaEnVivo(act.cantidad_comprada);
  }

  evaluarCoberturaEnVivo(cantidad: number): void {
    if (!this.editingId || cantidad === null || cantidad === undefined) return;
    this.api.evaluarCobertura(this.editingId, Number(cantidad)).subscribe({
      next: (res) => this.cobertura.set(res),
    });
  }

  guardarCampana(confirmarDeficit: boolean): void {
    if (!this.formTitulo.trim()) return;

    if (!this.editingId) {
      this.api
        .createActividad({
          titulo: this.formTitulo.trim(),
          cantidad_comprada: this.formCantidad,
          fecha_inicio: this.formFechaInicio || null,
        })
        .subscribe({
          next: () => {
            this.modalFormOpen = false;
            this.messages.add({ severity: 'success', summary: 'Campaña creada', detail: 'Guardada en estado BORRADOR.' });
            this.cargar();
          },
        });
      return;
    }

    this.api
      .updateActividad(this.editingId, {
        titulo: this.formTitulo.trim(),
        cantidad_comprada: this.formCantidad,
        fecha_inicio: this.formFechaInicio || null,
        confirmar_deficit: confirmarDeficit,
      })
      .subscribe({
        next: () => {
          this.modalFormOpen = false;
          this.messages.add({ severity: 'success', summary: 'Actualizado', detail: 'Stock y campaña guardados.' });
          this.cargar();
        },
        error: (err) => {
          if (err?.error?.error?.code === 'DEFICIT_CONFIRMATION_REQUIRED') {
            this.confirm.confirm({
              header: 'Confirmar Déficit de Inventario',
              message: '¿Desea guardar a pesar del déficit proyectado respecto a los asociados activos?',
              acceptLabel: 'Sí, guardar',
              rejectLabel: 'Cancelar',
              accept: () => this.guardarCampana(true),
            });
          }
        },
      });
  }

  activar(act: Actividad): void {
    this.api.activarActividad(act.id).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Campaña activada', detail: `${act.titulo} ya está activa.` });
        this.cargar();
      },
    });
  }

  abrirCierre(act: Actividad): void {
    this.closingId = act.id;
    this.cierreConfirmText = '';
    this.cierreObs = '';
    this.modalCierreOpen = true;
  }

  confirmarCierre(): void {
    if (!this.closingId) return;
    this.api.cerrarActividad(this.closingId, this.cierreObs).subscribe({
      next: () => {
        this.modalCierreOpen = false;
        this.messages.add({ severity: 'warn', summary: 'Campaña cerrada', detail: 'Modo solo lectura activado.' });
        this.cargar();
      },
    });
  }

  onFileSelected(event: Event, actividadId: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importing.set(true);
    this.uploadProgress.set(10);

    this.api
      .presignImport({
        actividad_id: actividadId,
        nombre_archivo: file.name,
        content_type:
          file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      .subscribe({
        next: (pre) => {
          this.api.uploadToPresigned(pre.url, pre.fields, file).subscribe({
            next: (ev) => {
              if (ev.type === HttpEventType.UploadProgress && ev.total) {
                this.uploadProgress.set(Math.round((ev.loaded / ev.total) * 70));
              }
              if (ev.type === HttpEventType.Response) {
                this.uploadProgress.set(85);
                this.api
                  .procesarImport({
                    actividad_id: actividadId,
                    s3_key: pre.s3_key,
                    nombre_archivo: file.name,
                  })
                  .subscribe({
                    next: (res) => {
                      this.uploadProgress.set(100);
                      this.importing.set(false);
                      this.messages.add({
                        severity: 'success',
                        summary: 'Importación completada',
                        detail: `Filas: ${res.total_filas} | Nuevos: ${res.total_nuevos} | Actualizados: ${res.total_actualizados}`,
                      });
                      this.cargar();
                      input.value = '';
                    },
                    error: () => {
                      this.importing.set(false);
                      this.uploadProgress.set(0);
                    },
                  });
              }
            },
            error: () => {
              this.importing.set(false);
              this.uploadProgress.set(0);
            },
          });
        },
        error: () => {
          this.importing.set(false);
          this.uploadProgress.set(0);
        },
      });
  }
}

