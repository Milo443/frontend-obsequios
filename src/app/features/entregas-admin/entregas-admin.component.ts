import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import type { AnulacionItem, EntregaRegistrada, Sede } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { AuthStore } from '../../core/services/auth.store';

@Component({
  selector: 'app-entregas-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    TableModule,
    TagModule,
    DialogModule,
    TabsModule,
  ],
  template: `
    <div class="cemcop-card">
      <h2 style="margin-top: 0">Entregas Registradas y Gestión de Anulaciones</h2>

      <p-tabs value="0">
        <p-tablist>
          <p-tab value="0">Entregas Registradas</p-tab>
          <p-tab value="1">Historial de Anulaciones</p-tab>
        </p-tablist>

        <p-tabpanels>
          <p-tabpanel value="0">
            <div class="cemcop-flex-row mb-2 mt-1">
              <input
                pInputText
                [(ngModel)]="filtroQ"
                (keydown.enter)="cargarEntregas(1)"
                placeholder="Cédula o nombre..."
                style="min-width: 220px; flex: 1"
              />
              <input
                pInputText
                [(ngModel)]="filtroFecha"
                placeholder="YYYY-MM-DD"
                style="width: 140px"
              />
              <p-select
                [options]="sedes()"
                [(ngModel)]="filtroSede"
                optionLabel="nombre"
                optionValue="id"
                [showClear]="true"
                placeholder="Todas las sedes"
              />
              <p-select
                [options]="estadoOptions"
                [(ngModel)]="filtroEstado"
                [showClear]="true"
                placeholder="Todos los estados"
              />
              <p-button label="Filtrar" icon="pi pi-filter" (onClick)="cargarEntregas(1)" />
            </div>

            <p-table
              [value]="entregas()"
              [lazy]="true"
              [paginator]="true"
              [rows]="25"
              [totalRecords]="totalEntregas()"
              (onLazyLoad)="onLazyEntregas($event)"
              responsiveLayout="stack"
              breakpoint="768px"
            >
              <ng-template #header>
                <tr>
                  <th>Fecha / Hora</th>
                  <th>Cédula</th>
                  <th>Asociado</th>
                  <th>Sede / Repartidor</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </ng-template>
              <ng-template #body let-row>
                <tr>
                  <td>{{ row.fecha_entrega }} {{ row.hora_entrega }}</td>
                  <td>{{ row.cedula_historica }}</td>
                  <td>
                    <strong>{{ row.nombre_historico }}</strong>
                    @if (row.otra_informacion) {
                      <div class="cemcop-muted">{{ row.otra_informacion }}</div>
                    }
                  </td>
                  <td>
                    <div>{{ row.sede.nombre }}</div>
                    <small class="cemcop-muted">{{ row.repartidor.nombre }}</small>
                  </td>
                  <td>
                    <p-tag
                      [severity]="row.estado === 'ENTREGADO' ? 'success' : 'danger'"
                      [value]="row.estado"
                    />
                  </td>
                  <td>
                    <div class="cemcop-flex-row">
                      <p-button
                        label="Ver Firma"
                        icon="pi pi-eye"
                        size="small"
                        severity="secondary"
                        (onClick)="verFirma(row)"
                      />
                      @if (row.estado === 'ENTREGADO' && !authStore.isCampaignClosed()) {
                        <p-button
                          label="Anular"
                          icon="pi pi-ban"
                          size="small"
                          severity="danger"
                          (onClick)="abrirAnular(row)"
                        />
                      }
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabpanel>

          <p-tabpanel value="1">
            <p-table [value]="anulaciones()" responsiveLayout="stack" breakpoint="768px">
              <ng-template #header>
                <tr>
                  <th>Fecha Anulación</th>
                  <th>Cédula</th>
                  <th>Asociado</th>
                  <th>Motivo</th>
                  <th>Administrador</th>
                </tr>
              </ng-template>
              <ng-template #body let-a>
                <tr>
                  <td>{{ a.fecha_anulacion }}</td>
                  <td>{{ a.cedula }}</td>
                  <td>{{ a.nombre_asociado }}</td>
                  <td>{{ a.motivo }}</td>
                  <td>{{ a.admin_nombre }}</td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </div>

    <!-- Modal Visor de Firma Bajo Demanda (evita OOM en tablets) -->
    <p-dialog
      [(visible)]="modalFirmaOpen"
      [modal]="true"
      [header]="'Soporte de Firma · ' + (firmaTargetName() ?? '')"
      [style]="{ width: '480px' }"
      [breakpoints]="{ '640px': '95vw' }"
    >
      @if (firmaUrl()) {
        <div style="background: #fff; padding: 1rem; border-radius: 8px; border: 1px solid var(--cemcop-border)">
          <img [src]="firmaUrl()" alt="Firma digital" style="max-width: 100%; display: block; margin: auto" />
        </div>
      }
    </p-dialog>

    <!-- Modal Anulación Justificada (HU-06) -->
    <p-dialog
      [(visible)]="modalAnularOpen"
      [modal]="true"
      header="Anular Entrega y Reintegrar Saldo"
      [style]="{ width: '480px' }"
      [breakpoints]="{ '640px': '95vw' }"
    >
      <div class="cemcop-stack">
        <p class="cemcop-muted">
          Asociado: <strong>{{ anularTarget?.nombre_historico }} ({{ anularTarget?.cedula_historica }})</strong>
        </p>
        <div>
          <label class="cemcop-label">Motivo obligatorio * (mínimo 15 caracteres)</label>
          <textarea
            pTextarea
            rows="3"
            class="w-full"
            [(ngModel)]="motivoAnulacion"
            placeholder="Explique la causa de anulación..."
          ></textarea>
        </div>
        <div class="cemcop-flex-row" style="justify-content: flex-end">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="modalAnularOpen = false" />
          <p-button
            label="Confirmar Anulación"
            severity="danger"
            icon="pi pi-check"
            [disabled]="motivoAnulacion.trim().length < 15"
            (onClick)="confirmarAnulacion()"
          />
        </div>
      </div>
    </p-dialog>
  `,
})
export class EntregasAdminComponent implements OnInit {
  readonly authStore = inject(AuthStore);
  private readonly api = inject(ApiService);
  private readonly messages = inject(MessageService);

  readonly sedes = signal<Sede[]>([]);
  readonly entregas = signal<EntregaRegistrada[]>([]);
  readonly totalEntregas = signal(0);
  readonly anulaciones = signal<AnulacionItem[]>([]);

  filtroQ = '';
  filtroFecha = '';
  filtroSede: number | undefined;
  filtroEstado: 'ENTREGADO' | 'ANULADO' | undefined;
  readonly estadoOptions = ['ENTREGADO', 'ANULADO'];

  modalFirmaOpen = false;
  readonly firmaUrl = signal<string | null>(null);
  readonly firmaTargetName = signal<string | null>(null);

  modalAnularOpen = false;
  anularTarget: EntregaRegistrada | null = null;
  motivoAnulacion = '';

  ngOnInit(): void {
    this.api.getSedes().subscribe({ next: (r) => this.sedes.set(r.sedes) });
    this.api.getActividadActiva().subscribe({
      next: (act) => {
        this.authStore.setActiveCampaign({ id: act.id, titulo: act.titulo, estado: act.estado });
        this.cargarAnulaciones();
      },
    });
  }

  onLazyEntregas(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? 25;
    const page = Math.floor((event.first ?? 0) / rows) + 1;
    this.cargarEntregas(page, rows);
  }

  cargarEntregas(page = 1, limit = 25): void {
    this.api
      .getEntregas({
        actividad_id: this.authStore.activeCampaign()?.id,
        q: this.filtroQ || undefined,
        fecha: this.filtroFecha || undefined,
        sede_id: this.filtroSede,
        estado: this.filtroEstado,
        page,
        limit,
      })
      .subscribe({
        next: (r) => {
          this.entregas.set(r.entregas);
          this.totalEntregas.set(r.total);
        },
      });
  }

  cargarAnulaciones(): void {
    this.api.getAnulaciones({ actividad_id: this.authStore.activeCampaign()?.id }).subscribe({
      next: (r) => this.anulaciones.set(r.anulaciones),
    });
  }

  verFirma(row: EntregaRegistrada): void {
    this.firmaTargetName.set(`${row.nombre_historico} (${row.cedula_historica})`);
    this.firmaUrl.set(null);
    this.api.getEntregaFirma(row.id).subscribe({
      next: (r) => {
        this.firmaUrl.set(r.firma_preview_url);
        this.modalFirmaOpen = true;
      },
    });
  }

  abrirAnular(row: EntregaRegistrada): void {
    this.anularTarget = row;
    this.motivoAnulacion = '';
    this.modalAnularOpen = true;
  }

  confirmarAnulacion(): void {
    if (!this.anularTarget) return;
    this.api.anularEntrega(this.anularTarget.id, this.motivoAnulacion.trim()).subscribe({
      next: () => {
        this.modalAnularOpen = false;
        this.messages.add({
          severity: 'success',
          summary: 'Entrega anulada',
          detail: 'El obsequio se reintegró al saldo disponible.',
        });
        this.cargarEntregas(1);
        this.cargarAnulaciones();
      },
    });
  }
}

