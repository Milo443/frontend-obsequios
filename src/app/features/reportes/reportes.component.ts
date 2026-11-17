import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import type { Actividad, ControlDiarioResponse, Sede } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, InputTextModule, SelectModule, TableModule, MessageModule],
  template: `
    <div class="cemcop-stack">
      <div class="cemcop-card">
        <div class="cemcop-flex-between mb-2">
          <div>
            <h2 style="margin: 0">Control Diario y Reportes Excel (.xlsx)</h2>
            <small class="cemcop-muted">Incluye firmas digitalizadas embebidas como soporte probatorio</small>
          </div>
          <div class="cemcop-flex-row">
            <p-button
              label="Descargar Excel Completo (.xlsx)"
              icon="pi pi-file-excel"
              [loading]="generando()"
              [disabled]="!selectedActividadId"
              (onClick)="generar('COMPLETO')"
            />
          </div>
        </div>

        <div class="cemcop-flex-row mb-2">
          <p-select
            [options]="actividades()"
            [(ngModel)]="selectedActividadId"
            (ngModelChange)="cargarControlDiario()"
            optionLabel="titulo"
            optionValue="id"
            placeholder="Seleccione campaña"
            style="min-width: 240px"
          />
          <p-select
            [options]="sedes()"
            [(ngModel)]="selectedSedeId"
            (ngModelChange)="cargarControlDiario()"
            optionLabel="nombre"
            optionValue="id"
            [showClear]="true"
            placeholder="Todas las sedes"
          />
          <input
            pInputText
            [(ngModel)]="fechaDiario"
            placeholder="YYYY-MM-DD"
            style="width: 140px"
          />
          <p-button
            label="Descargar Día (.xlsx)"
            icon="pi pi-calendar"
            severity="secondary"
            [loading]="generando()"
            [disabled]="!selectedActividadId"
            (onClick)="generar('DIARIO')"
          />
        </div>

        @if (estadoJob()) {
          <p-message severity="info" styleClass="mb-2">{{ estadoJob() }}</p-message>
        }

        @if (control(); as ctrl) {
          <p class="mb-1">
            <strong>Cantidad Comprada:</strong> {{ ctrl.cantidad_comprada }}
          </p>
          <p-table [value]="ctrl.dias" responsiveLayout="stack" breakpoint="640px">
            <ng-template #header>
              <tr>
                <th>Fecha</th>
                <th>Entregados Brutos</th>
                <th>Anulaciones Día</th>
                <th>Entregados Netos</th>
                <th>Acumulado Neto</th>
                <th>Saldo al Cierre</th>
              </tr>
            </ng-template>
            <ng-template #body let-d>
              <tr>
                <td><strong>{{ d.fecha }}</strong></td>
                <td>{{ d.entregados_brutos }}</td>
                <td>{{ d.anulaciones_dia }}</td>
                <td><strong>{{ d.entregados_netos }}</strong></td>
                <td>{{ d.acumulado_neto }}</td>
                <td>{{ d.saldo }}</td>
              </tr>
            </ng-template>
          </p-table>
        }
      </div>
    </div>
  `,
})
export class ReportesComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly messages = inject(MessageService);

  readonly actividades = signal<Actividad[]>([]);
  readonly sedes = signal<Sede[]>([]);
  readonly control = signal<ControlDiarioResponse | null>(null);
  readonly generando = signal(false);
  readonly estadoJob = signal<string | null>(null);

  selectedActividadId: number | null = null;
  selectedSedeId: number | undefined;
  fechaDiario = new Date().toISOString().slice(0, 10);
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.api.getSedes().subscribe({ next: (r) => this.sedes.set(r.sedes) });
    this.api.getActividades().subscribe({
      next: (r) => {
        this.actividades.set(r.actividades);
        const activa = r.actividades.find((a) => a.estado === 'ACTIVA') ?? r.actividades[0];
        if (activa) {
          this.selectedActividadId = activa.id;
          this.cargarControlDiario();
        }
      },
    });
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  cargarControlDiario(): void {
    if (!this.selectedActividadId) return;
    this.api.getControlDiario(this.selectedActividadId, this.selectedSedeId).subscribe({
      next: (res) => this.control.set(res),
    });
  }

  generar(tipo: 'COMPLETO' | 'DIARIO'): void {
    if (!this.selectedActividadId) return;
    if (this.pollTimer) clearInterval(this.pollTimer);

    this.generando.set(true);
    this.estadoJob.set('Generando libro Excel con firmas embebidas...');

    this.api
      .generarReporte({
        actividad_id: this.selectedActividadId,
        tipo,
        fecha: tipo === 'DIARIO' ? this.fechaDiario : undefined,
      })
      .subscribe({
        next: (job) => {
          this.pollTimer = setInterval(() => {
            this.api.getReporteStatus(job.job_id).subscribe({
              next: (st) => {
                if (st.estado === 'LISTO' && st.download_url) {
                  if (this.pollTimer) clearInterval(this.pollTimer);
                  this.generando.set(false);
                  this.estadoJob.set(`Reporte listo: ${st.nombre_archivo}`);
                  window.open(st.download_url, '_blank');
                } else if (st.estado === 'FALLIDO') {
                  if (this.pollTimer) clearInterval(this.pollTimer);
                  this.generando.set(false);
                  this.estadoJob.set(null);
                  this.messages.add({
                    severity: 'error',
                    summary: 'Error generando reporte',
                    detail: st.error ?? 'Intente nuevamente.',
                  });
                }
              },
            });
          }, 1500);
        },
        error: () => {
          this.generando.set(false);
          this.estadoJob.set(null);
        },
      });
  }
}

