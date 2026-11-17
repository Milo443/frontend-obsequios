import { ChangeDetectionStrategy, Component, inject, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ColorPickerModule } from 'primeng/colorpicker';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import {
  BaseThemePreset,
  PRESET_THEMES,
  SurfaceScale,
  ThemeService,
} from '../../core/services/theme.service';

@Component({
  selector: 'app-theme-customizer-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DrawerModule,
    ButtonModule,
    ColorPickerModule,
    InputTextModule,
    SelectButtonModule,
    ToggleSwitchModule,
    TagModule,
    TextareaModule,
  ],
  template: `
    <p-drawer
      [(visible)]="visible"
      position="right"
      header="Personalizar Apariencia y Paleta"
      [style]="{ width: 'min(94vw, 420px)' }"
    >
      <div class="cemcop-stack">
        <!-- Presets institucionales -->
        <div>
          <span class="cemcop-label">Temas Predefinidos</span>
          <div class="cemcop-grid cemcop-grid-2">
            @for (preset of namedPresets; track preset.id) {
              <button
                type="button"
                class="preset-tile"
                (click)="themeService.applyNamedPreset(preset)"
              >
                <span class="swatch-dot" [style.background]="preset.config.primaryHex"></span>
                <div class="preset-info">
                  <strong>{{ preset.label }}</strong>
                  <small>{{ preset.description }}</small>
                </div>
              </button>
            }
          </div>
        </div>

        <!-- Modo Claro / Oscuro -->
        <div class="cemcop-flex-between setting-row">
          <div>
            <span class="cemcop-label" style="margin-bottom: 0">Modo Oscuro</span>
            <small class="cemcop-muted">Reduce fatiga visual en jornadas nocturnas</small>
          </div>
          <p-toggleswitch
            [ngModel]="themeService.config().darkMode"
            (ngModelChange)="themeService.setDarkMode($event)"
          />
        </div>

        <!-- Color Primario Libre -->
        <div>
          <span class="cemcop-label">Color Primario Personalizado</span>
          <div class="cemcop-flex-row">
            <p-colorpicker
              [ngModel]="themeService.config().primaryHex"
              (ngModelChange)="themeService.setPrimaryHex($event)"
              format="hex"
            />
            <input
              pInputText
              [ngModel]="themeService.config().primaryHex"
              (ngModelChange)="themeService.setPrimaryHex($event)"
              maxlength="7"
              placeholder="#0f766e"
              style="width: 7.5rem; font-family: monospace"
            />
            <p-tag
              [severity]="themeService.isWcagAA() ? 'success' : 'warn'"
              [value]="'Contraste ' + themeService.wcagContrastRatio() + ':1'"
            />
          </div>
          <div class="quick-swatches mt-1">
            @for (hex of quickSwatches; track hex) {
              <button
                type="button"
                class="swatch-btn"
                [style.background]="hex"
                [attr.aria-label]="'Color ' + hex"
                (click)="themeService.setPrimaryHex(hex)"
              ></button>
            }
          </div>
        </div>

        <!-- Preset Base PrimeNG -->
        <div>
          <span class="cemcop-label">Estilo Base de Componentes</span>
          <p-selectbutton
            [options]="baseOptions"
            [ngModel]="themeService.config().basePreset"
            (ngModelChange)="onBaseChange($event)"
            optionLabel="label"
            optionValue="value"
            [allowEmpty]="false"
            styleClass="w-full"
          />
        </div>

        <!-- Escala de Superficie -->
        <div>
          <span class="cemcop-label">Tono de Superficie Neutro</span>
          <p-selectbutton
            [options]="surfaceOptions"
            [ngModel]="themeService.config().surface"
            (ngModelChange)="onSurfaceChange($event)"
            optionLabel="label"
            optionValue="value"
            [allowEmpty]="false"
            styleClass="w-full"
          />
        </div>

        <!-- Radio de Bordes -->
        <div>
          <span class="cemcop-label">Redondeado de Bordes</span>
          <p-selectbutton
            [options]="radiusOptions"
            [ngModel]="themeService.config().borderRadiusPx"
            (ngModelChange)="themeService.setBorderRadius($event)"
            optionLabel="label"
            optionValue="value"
            [allowEmpty]="false"
          />
        </div>

        <!-- Exportar / Importar JSON -->
        <div>
          <span class="cemcop-label">Exportar / Importar Paleta JSON</span>
          <div class="cemcop-flex-row mb-1">
            <p-button
              label="Copiar JSON"
              icon="pi pi-copy"
              severity="secondary"
              size="small"
              (onClick)="copyJson()"
            />
            <p-button
              label="Aplicar JSON"
              icon="pi pi-upload"
              severity="secondary"
              size="small"
              (onClick)="applyJson()"
            />
            <p-button
              label="Restablecer"
              icon="pi pi-refresh"
              severity="contrast"
              [outlined]="true"
              size="small"
              (onClick)="themeService.resetDefault()"
            />
          </div>
          <textarea
            pTextarea
            rows="4"
            class="w-full"
            style="font-family: monospace; font-size: 0.78rem"
            [(ngModel)]="jsonBuffer"
            placeholder="Pega aquí una configuración JSON de tema para importarla..."
          ></textarea>
        </div>
      </div>
    </p-drawer>
  `,
  styles: `
    .preset-tile {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      padding: 0.65rem;
      border-radius: var(--cemcop-radius);
      border: 1px solid var(--cemcop-border);
      background: var(--cemcop-surface-alt);
      color: var(--cemcop-text);
      text-align: left;
      cursor: pointer;
      min-height: 3.5rem;
    }
    .preset-tile:hover {
      border-color: var(--cemcop-primary);
    }
    .swatch-dot {
      width: 1.25rem;
      height: 1.25rem;
      border-radius: 999px;
      flex-shrink: 0;
      margin-top: 0.15rem;
    }
    .preset-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      font-size: 0.8rem;
    }
    .preset-info small {
      color: var(--cemcop-text-muted);
      line-height: 1.2;
    }
    .setting-row {
      padding: 0.75rem;
      border-radius: var(--cemcop-radius);
      border: 1px solid var(--cemcop-border);
      background: var(--cemcop-surface-alt);
    }
    .quick-swatches {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .swatch-btn {
      width: 2rem;
      height: 2rem;
      border-radius: 999px;
      border: 2px solid var(--cemcop-surface);
      box-shadow: 0 0 0 1px var(--cemcop-border);
      cursor: pointer;
    }
  `,
})
export class ThemeCustomizerDrawerComponent {
  readonly visible = model<boolean>(false);
  readonly themeService = inject(ThemeService);
  private readonly messages = inject(MessageService);

  readonly namedPresets = PRESET_THEMES;
  readonly quickSwatches = [
    '#0f766e',
    '#1b365d',
    '#2563eb',
    '#047857',
    '#7c3aed',
    '#b45309',
    '#be123c',
    '#0284c7',
  ];

  readonly baseOptions: Array<{ label: string; value: BaseThemePreset }> = [
    { label: 'Aura', value: 'aura' },
    { label: 'Lara', value: 'lara' },
    { label: 'Nora', value: 'nora' },
  ];

  readonly surfaceOptions: Array<{ label: string; value: SurfaceScale }> = [
    { label: 'Slate', value: 'slate' },
    { label: 'Zinc', value: 'zinc' },
    { label: 'Neutral', value: 'neutral' },
    { label: 'Stone', value: 'stone' },
  ];

  readonly radiusOptions = [
    { label: 'Cuadrado', value: 4 },
    { label: 'Medio', value: 10 },
    { label: 'Suave', value: 14 },
  ];

  jsonBuffer = signal('');

  onBaseChange(val: BaseThemePreset | null): void {
    if (val) this.themeService.setBasePreset(val);
  }

  onSurfaceChange(val: SurfaceScale | null): void {
    if (val) this.themeService.setSurface(val);
  }

  async copyJson(): Promise<void> {
    const json = this.themeService.exportConfigJson();
    this.jsonBuffer.set(json);
    try {
      await navigator.clipboard.writeText(json);
      this.messages.add({ severity: 'success', summary: 'Paleta copiada', detail: 'JSON copiado al portapapeles.' });
    } catch {
      this.messages.add({ severity: 'info', summary: 'JSON generado', detail: 'Puedes copiarlo desde el cuadro de texto.' });
    }
  }

  applyJson(): void {
    const ok = this.themeService.importConfigJson(this.jsonBuffer());
    this.messages.add({
      severity: ok ? 'success' : 'error',
      summary: ok ? 'Paleta aplicada' : 'JSON inválido',
      detail: ok ? 'Se actualizó la paleta correctamente.' : 'Verifica el formato JSON y el código hexadecimal.',
    });
  }
}

