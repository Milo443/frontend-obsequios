import { Injectable, computed, effect, signal } from '@angular/core';
import { definePreset, palette, updatePreset, usePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import Lara from '@primeuix/themes/lara';
import Nora from '@primeuix/themes/nora';

export type BaseThemePreset = 'aura' | 'lara' | 'nora';
export type SurfaceScale = 'slate' | 'zinc' | 'neutral' | 'stone';

export interface ThemeConfigState {
  basePreset: BaseThemePreset;
  primaryHex: string;
  surface: SurfaceScale;
  darkMode: boolean;
  borderRadiusPx: number;
}

export interface NamedThemePreset {
  id: string;
  label: string;
  description: string;
  config: ThemeConfigState;
}

const STORAGE_KEY = 'cemcop_theme_config_v1';

const DEFAULT_CONFIG: ThemeConfigState = {
  basePreset: 'aura',
  primaryHex: '#0f766e',
  surface: 'slate',
  darkMode: false,
  borderRadiusPx: 10,
};

export const PRESET_THEMES: NamedThemePreset[] = [
  {
    id: 'cemcop-institucional',
    label: 'CEMCOP Institucional',
    description: 'Verde esmeralda corporativo con contraste optimizado',
    config: { basePreset: 'aura', primaryHex: '#0f766e', surface: 'slate', darkMode: false, borderRadiusPx: 10 },
  },
  {
    id: 'azul-ejecutivo',
    label: 'Azul Ejecutivo',
    description: 'Azul marino gerencial de alta legibilidad',
    config: { basePreset: 'lara', primaryHex: '#1b365d', surface: 'slate', darkMode: false, borderRadiusPx: 8 },
  },
  {
    id: 'alto-contraste-exterior',
    label: 'Alto Contraste Exterior',
    description: 'Ideal para tablets bajo luz solar directa en sedes',
    config: { basePreset: 'nora', primaryHex: '#047857', surface: 'neutral', darkMode: false, borderRadiusPx: 6 },
  },
  {
    id: 'modo-nocturno',
    label: 'Modo Nocturno',
    description: 'Superficie oscura para jornadas extendidas',
    config: { basePreset: 'aura', primaryHex: '#14b8a6', surface: 'zinc', darkMode: true, borderRadiusPx: 10 },
  },
];

export const CemcopInitialPreset = definePreset(Aura, {
  semantic: {
    primary: palette('#0f766e'),
  },
});

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function relativeLuminance(r: number, g: number, b: number): number {
  const toLinear = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(lum1: number, lum2: number): number {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

function buildSurfacePalette(scale: SurfaceScale) {
  return {
    light: {
      surface: {
        0: '#ffffff',
        50: `{${scale}.50}`,
        100: `{${scale}.100}`,
        200: `{${scale}.200}`,
        300: `{${scale}.300}`,
        400: `{${scale}.400}`,
        500: `{${scale}.500}`,
        600: `{${scale}.600}`,
        700: `{${scale}.700}`,
        800: `{${scale}.800}`,
        900: `{${scale}.900}`,
        950: `{${scale}.950}`,
      },
    },
    dark: {
      surface: {
        0: '#ffffff',
        50: `{${scale}.50}`,
        100: `{${scale}.100}`,
        200: `{${scale}.200}`,
        300: `{${scale}.300}`,
        400: `{${scale}.400}`,
        500: `{${scale}.500}`,
        600: `{${scale}.600}`,
        700: `{${scale}.700}`,
        800: `{${scale}.800}`,
        900: `{${scale}.900}`,
        950: `{${scale}.950}`,
      },
    },
  };
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly config = signal<ThemeConfigState>(this.loadStoredConfig());

  /** Contraste automático WCAG 2.1 para texto sobre color primario */
  readonly primaryContrastColor = computed(() => {
    const rgb = hexToRgb(this.config().primaryHex);
    if (!rgb) return '#ffffff';
    const lum = relativeLuminance(rgb.r, rgb.g, rgb.b);
    const ratioWhite = contrastRatio(lum, 1.0);
    const ratioBlack = contrastRatio(lum, 0.0);
    return ratioBlack > ratioWhite ? '#0f172a' : '#ffffff';
  });

  readonly wcagContrastRatio = computed(() => {
    const rgb = hexToRgb(this.config().primaryHex);
    if (!rgb) return 4.5;
    const lum = relativeLuminance(rgb.r, rgb.g, rgb.b);
    const targetLum = this.primaryContrastColor() === '#ffffff' ? 1.0 : 0.015;
    return Number(contrastRatio(lum, targetLum).toFixed(2));
  });

  readonly isWcagAA = computed(() => this.wcagContrastRatio() >= 4.5);

  private lastBasePreset: BaseThemePreset | null = null;

  constructor() {
    effect(() => {
      const cfg = this.config();
      this.applyThemeToDom(cfg);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
      } catch {
        // Ignorar si storage está bloqueado
      }
    });
  }

  private loadStoredConfig(): ThemeConfigState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_CONFIG;
      const parsed = JSON.parse(raw) as Partial<ThemeConfigState>;
      return {
        basePreset: parsed.basePreset ?? DEFAULT_CONFIG.basePreset,
        primaryHex: hexToRgb(parsed.primaryHex ?? '') ? parsed.primaryHex! : DEFAULT_CONFIG.primaryHex,
        surface: parsed.surface ?? DEFAULT_CONFIG.surface,
        darkMode: Boolean(parsed.darkMode),
        borderRadiusPx:
          typeof parsed.borderRadiusPx === 'number' ? parsed.borderRadiusPx : DEFAULT_CONFIG.borderRadiusPx,
      };
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  private applyThemeToDom(cfg: ThemeConfigState): void {
    const hex = hexToRgb(cfg.primaryHex) ? cfg.primaryHex : DEFAULT_CONFIG.primaryHex;
    const contrastHex = this.primaryContrastColor();

    const baseMap = { aura: Aura, lara: Lara, nora: Nora };
    const radius = `${cfg.borderRadiusPx}px`;

    const tokenPatch = {
      primitive: {
        borderRadius: {
          xs: `${Math.max(2, cfg.borderRadiusPx - 6)}px`,
          sm: `${Math.max(4, cfg.borderRadiusPx - 4)}px`,
          md: radius,
          lg: `${cfg.borderRadiusPx + 2}px`,
          xl: `${cfg.borderRadiusPx + 6}px`,
        },
      },
      semantic: {
        primary: palette(hex),
        colorScheme: {
          light: {
            ...buildSurfacePalette(cfg.surface).light,
            primary: {
              color: '{primary.500}',
              contrastColor: contrastHex,
              hoverColor: '{primary.600}',
              activeColor: '{primary.700}',
            },
          },
          dark: {
            ...buildSurfacePalette(cfg.surface).dark,
            primary: {
              color: '{primary.400}',
              contrastColor: contrastHex,
              hoverColor: '{primary.300}',
              activeColor: '{primary.200}',
            },
          },
        },
      },
    };

    if (this.lastBasePreset !== cfg.basePreset) {
      const built = definePreset(baseMap[cfg.basePreset], tokenPatch);
      usePreset(built);
      this.lastBasePreset = cfg.basePreset;
    } else {
      updatePreset(tokenPatch);
    }

    const htmlEl = document.documentElement;
    if (cfg.darkMode) {
      htmlEl.classList.add('cemcop-dark');
    } else {
      htmlEl.classList.remove('cemcop-dark');
    }

    htmlEl.style.setProperty('--cemcop-radius', radius);
    htmlEl.style.setProperty('--p-primary-contrast-color', contrastHex);
  }

  setPrimaryHex(hex: string): void {
    const normalized = hex.startsWith('#') ? hex : `#${hex}`;
    if (!hexToRgb(normalized)) return;
    this.config.update((c) => ({ ...c, primaryHex: normalized }));
  }

  setBasePreset(basePreset: BaseThemePreset): void {
    this.config.update((c) => ({ ...c, basePreset }));
  }

  setSurface(surface: SurfaceScale): void {
    this.config.update((c) => ({ ...c, surface }));
  }

  setDarkMode(darkMode: boolean): void {
    this.config.update((c) => ({ ...c, darkMode }));
  }

  setBorderRadius(borderRadiusPx: number): void {
    this.config.update((c) => ({ ...c, borderRadiusPx }));
  }

  applyNamedPreset(preset: NamedThemePreset): void {
    this.config.set({ ...preset.config });
  }

  resetDefault(): void {
    this.config.set({ ...DEFAULT_CONFIG });
  }

  exportConfigJson(): string {
    return JSON.stringify(this.config(), null, 2);
  }

  importConfigJson(jsonText: string): boolean {
    try {
      const parsed = JSON.parse(jsonText) as Partial<ThemeConfigState>;
      if (!parsed.primaryHex || !hexToRgb(parsed.primaryHex)) return false;
      this.config.set({
        basePreset: parsed.basePreset ?? 'aura',
        primaryHex: parsed.primaryHex,
        surface: parsed.surface ?? 'slate',
        darkMode: Boolean(parsed.darkMode),
        borderRadiusPx: parsed.borderRadiusPx ?? 10,
      });
      return true;
    } catch {
      return false;
    }
  }
}

