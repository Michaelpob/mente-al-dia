/**
 * Preferencias de la barra de accesibilidad.
 * Se guardan en localStorage porque no contienen datos personales; si el navegador
 * bloquea el almacenamiento, el sitio funciona igual con los valores por defecto.
 */
export const TEXT_SCALE_STEPS = [0.9, 1, 1.1, 1.25, 1.4] as const;
export const DEFAULT_TEXT_SCALE_STEP = 1;

export interface AccessibilityPreferences {
  textScaleStep: number;
  highContrast: boolean;
  reducedMotion: boolean;
  easyReading: boolean;
  /** Avance automático de preguntas en el cuestionario (Fase 6). */
  autoAdvance: boolean;
}

export type TogglePreference = Exclude<keyof AccessibilityPreferences, 'textScaleStep'>;

export const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  textScaleStep: DEFAULT_TEXT_SCALE_STEP,
  highContrast: false,
  reducedMotion: false,
  easyReading: false,
  autoAdvance: true,
};

const STORAGE_KEY = 'mente-al-dia:accesibilidad';

function clampStep(step: number): number {
  return Math.min(Math.max(Math.round(step), 0), TEXT_SCALE_STEPS.length - 1);
}

export function textScaleFor(step: number): number {
  return TEXT_SCALE_STEPS[clampStep(step)] ?? 1;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function loadPreferences(): AccessibilityPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PREFERENCES;
    const data = parsed as Record<string, unknown>;
    return {
      textScaleStep:
        typeof data.textScaleStep === 'number'
          ? clampStep(data.textScaleStep)
          : DEFAULT_PREFERENCES.textScaleStep,
      highContrast: readBoolean(data.highContrast, DEFAULT_PREFERENCES.highContrast),
      reducedMotion: readBoolean(data.reducedMotion, DEFAULT_PREFERENCES.reducedMotion),
      easyReading: readBoolean(data.easyReading, DEFAULT_PREFERENCES.easyReading),
      autoAdvance: readBoolean(data.autoAdvance, DEFAULT_PREFERENCES.autoAdvance),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(preferences: AccessibilityPreferences): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Almacenamiento bloqueado (modo privado, políticas del equipo): se ignora.
  }
}

function setFlag(root: HTMLElement, name: string, value: string | null): void {
  if (value === null) root.removeAttribute(name);
  else root.setAttribute(name, value);
}

export function applyPreferences(
  preferences: AccessibilityPreferences,
  root: HTMLElement = document.documentElement,
): void {
  const scale = textScaleFor(preferences.textScaleStep);
  root.style.setProperty('--escala-texto', String(scale));
  // Con texto agrandado el encabezado pasa a su versión compacta (las media queries no lo detectan).
  setFlag(root, 'data-texto', scale > 1 ? 'grande' : null);
  setFlag(root, 'data-contraste', preferences.highContrast ? 'alto' : null);
  setFlag(root, 'data-movimiento', preferences.reducedMotion ? 'reducido' : null);
  setFlag(root, 'data-lectura', preferences.easyReading ? 'facil' : null);
}
