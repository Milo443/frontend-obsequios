import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil, of } from 'rxjs';
import type { ActividadActiva, AsociadoBusqueda, MiTurnoResponse } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { AuthStore } from '../../core/services/auth.store';
import { parseScannerOrSearchInput } from '../../core/utils/pdf417-parser';
import { SignaturePadComponent } from '../../shared/components/signature-pad.component';

@Component({
  selector: 'app-entregar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    TagModule,
    MessageModule,
    TableModule,
    SignaturePadComponent,
  ],
  template: `
    <div class="cemcop-stack">
      <!-- Encabezado con KPIs del turno -->
      <div class="cemcop-grid cemcop-grid-4">
        <div class="cemcop-card kpi-card">
          <span class="cemcop-muted">Campaña Activa</span>
          <strong class="kpi-value">{{ campana()?.titulo ?? 'Sin campaña activa' }}</strong>
        </div>
        <div class="cemcop-card kpi-card">
          <span class="cemcop-muted">Saldo Disponible</span>
          <strong class="kpi-value">{{ campana()?.saldo_disponible ?? 0 }}</strong>
        </div>
        <div class="cemcop-card kpi-card">
          <span class="cemcop-muted">Entregas en Mi Turno (Hoy)</span>
          <strong class="kpi-value">{{ miTurno()?.entregados_hoy ?? 0 }}</strong>
        </div>
        <div class="cemcop-card kpi-card">
          <span class="cemcop-muted">Sede Asignada</span>
          <strong class="kpi-value">{{ miTurno()?.sede?.nombre ?? authStore.user()?.sede?.nombre }}</strong>
        </div>
      </div>

      <!-- Buscador ágil + Escáner óptico 1D / PDF417 -->
      <div class="cemcop-card">
        <div class="cemcop-flex-between mb-1">
          <label class="cemcop-label" for="busquedaInput" style="margin-bottom: 0">
            Buscar Asociado (Cédula, Nombre o Escáner de Código de Barras / PDF417)
          </label>
          <p-button
            label="Teclado Numérico"
            icon="pi pi-calculator"
            severity="secondary"
            [outlined]="true"
            size="small"
            (onClick)="toggleNumericMode()"
          />
        </div>

        <div class="cemcop-flex-row">
          <input
            #searchInput
            pInputText
            id="busquedaInput"
            [(ngModel)]="searchText"
            (ngModelChange)="onSearchInput($event)"
            (keydown.enter)="onEnterSearch()"
            [attr.inputmode]="numericInputMode() ? 'numeric' : 'search'"
            placeholder="Escanee cédula o digite nombre (mín. 3 letras)..."
            class="flex-input"
            autofocus
          />
          <p-button label="Buscar" icon="pi pi-search" (onClick)="onEnterSearch()" />
          @if (searchText) {
            <p-button
              label="Limpiar"
              icon="pi pi-times"
              severity="secondary"
              [outlined]="true"
              (onClick)="resetSearch()"
            />
          }
        </div>

        @if (resultados().length > 1) {
          <div class="mt-2">
            <p class="cemcop-muted mb-1">Seleccione el asociado correspondiente:</p>
            <div class="cemcop-stack">
              @for (item of resultados(); track item.id) {
                <button
                  type="button"
                  class="result-option"
                  (click)="seleccionarAsociado(item)"
                >
                  <div>
                    <strong>{{ item.nombre_completo }}</strong>
                    <div class="cemcop-muted">CC {{ item.cedula }}</div>
                  </div>
                  <p-tag
                    [severity]="item.estado_entrega === 'ENTREGADO' ? 'danger' : 'success'"
                    [value]="item.estado_entrega"
                  />
                </button>
              }
            </div>
          </div>
        }

        @if (busquedaRealizada() && resultados().length === 0) {
          <div class="mt-2">
            <p-message severity="error">
              Asociado no encontrado en el censo habilitado de la campaña. Remita al asociado a la
              mesa de soporte / Administrador para su validación.
            </p-message>
          </div>
        }
      </div>

      <!-- Pantalla de éxito post-entrega -->
      @if (entregaExitosa(); as ok) {
        <div class="cemcop-card success-panel">
          <div class="cemcop-stack">
            <p-message severity="success">
              <strong>¡Entrega confirmada exitosamente!</strong> Registro #{{ ok.id }} guardado el
              {{ ok.fecha_entrega }} a las {{ ok.hora_entrega }}. Saldo restante:
              {{ ok.saldo_disponible }}.
            </p-message>
            <div>
              <p-button
                label="Buscar siguiente asociado"
                icon="pi pi-arrow-right"
                size="large"
                (onClick)="resetSearch()"
              />
            </div>
          </div>
        </div>
      }

      <!-- Ficha del asociado seleccionado -->
      @if (seleccionado(); as asoc) {
        <div class="cemcop-card">
          <div class="cemcop-flex-between mb-2">
            <div>
              <h2 style="margin: 0">{{ asoc.nombre_completo }}</h2>
              <span class="cemcop-muted">Cédula: {{ asoc.cedula }}</span>
            </div>
            <p-tag
              [severity]="asoc.estado_entrega === 'ENTREGADO' ? 'danger' : 'success'"
              [value]="asoc.estado_entrega === 'ENTREGADO' ? 'BLOQUEADO · YA ENTREGADO' : 'HABILITADO · PENDIENTE'"
            />
          </div>

          <div class="cemcop-grid cemcop-grid-3 mb-2">
            <div>
              <span class="cemcop-muted">Fecha Última Actualización</span>
              <div><strong>{{ asoc.fecha_ult_act ?? 'Sin registro' }}</strong></div>
            </div>
            <div>
              <span class="cemcop-muted">Dirección</span>
              <div><strong>{{ asoc.direccion ?? 'No registrada' }}</strong></div>
            </div>
            <div>
              <span class="cemcop-muted">Observaciones Base</span>
              <div><strong>{{ asoc.observacion ?? 'Sin observaciones' }}</strong></div>
            </div>
          </div>

          <!-- Escenario Bloqueado (HU-02 Escenario 1) -->
          @if (asoc.estado_entrega === 'ENTREGADO' && asoc.entrega) {
            <p-message severity="error" styleClass="mb-2">
              <strong>Entrega bloqueada:</strong> este asociado ya recibió su obsequio el
              {{ asoc.entrega.fecha_entrega }} a las {{ asoc.entrega.hora_entrega }}.
            </p-message>

            @if (asoc.entrega.otra_informacion) {
              <p class="mb-1"><strong>Otra información registrada:</strong> {{ asoc.entrega.otra_informacion }}</p>
            }

            @if (asoc.entrega.firma_preview_url) {
              <div class="prev-sig-box">
                <span class="cemcop-label">Firma registrada previamente:</span>
                <img [src]="asoc.entrega.firma_preview_url" alt="Firma previa" class="prev-sig-img" />
              </div>
            }
          } @else {
            <!-- Escenario Habilitado para Entrega (HU-03) -->
            <div class="cemcop-stack">
              <div>
                <label class="cemcop-label" for="otraInfo">
                  Otra información (diligenciar si reclama un tercero autorizado: nombre, parentesco y cédula)
                </label>
                <textarea
                  pTextarea
                  id="otraInfo"
                  rows="2"
                  class="w-full"
                  [(ngModel)]="otraInformacion"
                  placeholder="Ej. Se le entregó a la hija Lina Parra cc 1130665819"
                ></textarea>
              </div>

              <app-signature-pad (signatureChanged)="onSignatureChanged($event)" />

              <div class="cemcop-flex-row">
                <p-button
                  label="Confirmar Entrega"
                  icon="pi pi-check-circle"
                  size="large"
                  [disabled]="!signatureValid() || submitting() || authStore.isCampaignClosed()"
                  [loading]="submitting()"
                  (onClick)="confirmarEntrega()"
                />
              </div>
            </div>
          }
        </div>
      }

      <!-- Últimas entregas de Mi Turno -->
      @if (miTurno()?.ultimas_entregas?.length) {
        <div class="cemcop-card">
          <h3 style="margin-top: 0">Últimas Entregas de Mi Turno</h3>
          <p-table [value]="miTurno()!.ultimas_entregas" responsiveLayout="stack" breakpoint="640px">
            <ng-template #header>
              <tr>
                <th>Hora</th>
                <th>Cédula</th>
                <th>Asociado</th>
                <th>Estado</th>
                <th>Observación</th>
              </tr>
            </ng-template>
            <ng-template #body let-row>
              <tr>
                <td>{{ row.hora_entrega }}</td>
                <td>{{ row.cedula_historica }}</td>
                <td>{{ row.nombre_historico }}</td>
                <td>
                  <p-tag
                    [severity]="row.estado === 'ENTREGADO' ? 'success' : 'warn'"
                    [value]="row.estado"
                  />
                </td>
                <td>{{ row.otra_informacion || 'Titular' }}</td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      }
    </div>
  `,
  styles: `
    .kpi-card {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .kpi-value {
      font-size: clamp(1rem, 2vw, 1.35rem);
      color: var(--cemcop-text);
    }
    .flex-input {
      flex: 1;
      min-width: 220px;
    }
    .result-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-radius: var(--cemcop-radius);
      border: 1px solid var(--cemcop-border);
      background: var(--cemcop-surface-alt);
      color: var(--cemcop-text);
      cursor: pointer;
      text-align: left;
    }
    .result-option:hover {
      border-color: var(--cemcop-primary);
    }
    .prev-sig-box {
      padding: 1rem;
      border: 1px solid var(--cemcop-border);
      border-radius: var(--cemcop-radius);
      background: #ffffff;
      display: inline-block;
    }
    .prev-sig-img {
      max-width: 100%;
      max-height: 160px;
      display: block;
    }
  `,
})
export class EntregarComponent implements OnInit, OnDestroy {
  readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  readonly signaturePad = viewChild(SignaturePadComponent);

  readonly authStore = inject(AuthStore);
  private readonly api = inject(ApiService);
  private readonly messages = inject(MessageService);

  readonly campana = signal<ActividadActiva | null>(null);
  readonly miTurno = signal<MiTurnoResponse | null>(null);
  readonly resultados = signal<AsociadoBusqueda[]>([]);
  readonly seleccionado = signal<AsociadoBusqueda | null>(null);
  readonly busquedaRealizada = signal(false);
  readonly numericInputMode = signal(false);

  readonly signatureValid = signal(false);
  readonly signatureDataUrl = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly entregaExitosa = signal<{
    id: number;
    fecha_entrega: string;
    hora_entrega: string;
    saldo_disponible: number;
  } | null>(null);

  searchText = '';
  otraInformacion = '';
  private activeIdempotencyKey = crypto.randomUUID();
  private readonly search$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.cargarContexto();

    this.search$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((raw) => {
          const parsed = parseScannerOrSearchInput(raw);
          const isNumeric = /^[0-9]+$/.test(parsed);
          if (!parsed || (!isNumeric && parsed.length < 3)) {
            return of(null);
          }
          return this.api.buscarAsociados(parsed, this.campana()?.id);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((res) => {
        if (!res) return;
        this.aplicarResultados(res.resultados);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarContexto(): void {
    this.api.getActividadActiva().subscribe({
      next: (act) => {
        this.campana.set(act);
        this.authStore.setActiveCampaign({ id: act.id, titulo: act.titulo, estado: act.estado });
      },
      error: () => this.campana.set(null),
    });

    this.api.getMiTurno().subscribe({
      next: (t) => this.miTurno.set(t),
    });
  }

  toggleNumericMode(): void {
    this.numericInputMode.update((v) => !v);
    this.searchInputRef()?.nativeElement.focus();
  }

  onSearchInput(val: string): void {
    this.search$.next(val);
  }

  onEnterSearch(): void {
    const parsed = parseScannerOrSearchInput(this.searchText);
    if (!parsed) return;
    const isNumeric = /^[0-9]+$/.test(parsed);
    if (!isNumeric && parsed.length < 3) {
      this.messages.add({
        severity: 'info',
        summary: 'Búsqueda por nombre',
        detail: 'Ingrese al menos 3 caracteres para buscar por nombre.',
      });
      return;
    }

    this.searchText = parsed;
    this.api.buscarAsociados(parsed, this.campana()?.id).subscribe({
      next: (res) => this.aplicarResultados(res.resultados),
    });
  }

  private aplicarResultados(lista: AsociadoBusqueda[]): void {
    this.entregaExitosa.set(null);
    this.resultados.set(lista);
    this.busquedaRealizada.set(true);
    if (lista.length === 1) {
      this.seleccionarAsociado(lista[0]!);
    } else {
      this.seleccionado.set(null);
    }
  }

  seleccionarAsociado(asoc: AsociadoBusqueda): void {
    this.seleccionado.set(asoc);
    this.otraInformacion = '';
    this.signatureValid.set(false);
    this.signatureDataUrl.set(null);
    this.activeIdempotencyKey = crypto.randomUUID();
  }

  onSignatureChanged(ev: { valid: boolean; dataUrl: string | null }): void {
    this.signatureValid.set(ev.valid);
    this.signatureDataUrl.set(ev.dataUrl);
  }

  confirmarEntrega(): void {
    const asoc = this.seleccionado();
    const camp = this.campana();
    const firma = this.signaturePad()?.toPngDataUrl() ?? this.signatureDataUrl();

    if (!asoc || !camp || !firma) {
      this.messages.add({
        severity: 'warn',
        summary: 'Firma requerida',
        detail: 'Capture una firma válida antes de confirmar.',
      });
      return;
    }

    this.submitting.set(true);
    this.api
      .confirmarEntrega(
        {
          actividad_id: camp.id,
          asociado_id: asoc.id,
          firma_base64: firma,
          otra_informacion: this.otraInformacion.trim() || null,
        },
        this.activeIdempotencyKey,
      )
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.seleccionado.set(null);
          this.resultados.set([]);
          this.busquedaRealizada.set(false);
          this.entregaExitosa.set({
            id: res.id,
            fecha_entrega: res.fecha_entrega,
            hora_entrega: res.hora_entrega,
            saldo_disponible: res.saldo_disponible,
          });
          this.cargarContexto();
        },
        error: (err) => {
          this.submitting.set(false);
          const body = err?.error?.error;
          if (body?.code === 'ALREADY_DELIVERED') {
            this.seleccionado.set({
              ...asoc,
              estado_entrega: 'ENTREGADO',
              entrega: {
                id: 0,
                fecha_entrega: body.details?.fecha_entrega ?? '',
                hora_entrega: body.details?.hora_entrega ?? '',
                otra_informacion: null,
                firma_preview_url: body.details?.firma_preview_url ?? null,
              },
            });
          }
        },
      });
  }

  resetSearch(): void {
    this.searchText = '';
    this.otraInformacion = '';
    this.resultados.set([]);
    this.seleccionado.set(null);
    this.busquedaRealizada.set(false);
    this.entregaExitosa.set(null);
    this.signatureValid.set(false);
    this.signatureDataUrl.set(null);
    this.activeIdempotencyKey = crypto.randomUUID();
    setTimeout(() => this.searchInputRef()?.nativeElement.focus(), 50);
  }
}

