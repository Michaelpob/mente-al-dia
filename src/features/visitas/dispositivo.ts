/**
 * Tipo de dispositivo de una visita (D-80): teléfono móvil, tableta o computador.
 * Se decide con lo que el navegador dice de sí mismo y, si no basta, con la pantalla.
 */

export const TIPOS_DISPOSITIVO = ['movil', 'tableta', 'escritorio'] as const;
export type TipoDispositivo = (typeof TIPOS_DISPOSITIVO)[number];

export interface SenalesDispositivo {
  userAgent: string;
  /** navigator.userAgentData.mobile (Chrome y Edge), si existe. */
  movilSegunNavegador?: boolean;
  /** navigator.maxTouchPoints */
  puntosTactiles: number;
  /** El lado corto de la pantalla, en píxeles CSS. */
  ladoCorto: number;
  /** (pointer: coarse): se maneja con el dedo, no con un mouse. */
  punteroGrueso: boolean;
}

/** Desde este lado corto de la pantalla, un equipo táctil se cuenta como tableta. */
const LADO_CORTO_TABLETA = 600;

export function clasificarDispositivo(s: SenalesDispositivo): TipoDispositivo {
  const ua = s.userAgent;
  // «Tablet PC» aparece en navegadores viejos de Windows de escritorio: no es una tableta.
  if (/iPad|Tablet(?! PC)|PlayBook|Silk|Kindle|\bKF[A-Z]{2,4}\b/i.test(ua)) return 'tableta';
  // Desde iPadOS 13 el iPad se presenta como un Mac: se distingue porque tiene pantalla táctil.
  if (/Macintosh/i.test(ua) && s.puntosTactiles > 1) return 'tableta';
  if (/Mobi|iPhone|iPod|Windows Phone|IEMobile|Opera Mini|BlackBerry/i.test(ua)) return 'movil';
  // Los teléfonos Android dicen «Mobile»; sin esa palabra, es una tableta.
  if (/Android/i.test(ua)) return 'tableta';
  if (s.movilSegunNavegador) return 'movil';
  // Sin pistas en el navegador (por ejemplo, «sitio de escritorio» en un teléfono): una pantalla
  // táctil que se maneja con el dedo se cuenta por su tamaño.
  if (s.punteroGrueso && s.puntosTactiles > 0) {
    return s.ladoCorto < LADO_CORTO_TABLETA ? 'movil' : 'tableta';
  }
  return 'escritorio';
}

/** Las señales del navegador actual. */
export function senalesDelNavegador(): SenalesDispositivo {
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  return {
    userAgent: nav.userAgent ?? '',
    movilSegunNavegador: nav.userAgentData?.mobile,
    puntosTactiles: nav.maxTouchPoints ?? 0,
    ladoCorto: Math.min(window.screen?.width ?? 0, window.screen?.height ?? 0),
    punteroGrueso: window.matchMedia?.('(pointer: coarse)').matches ?? false,
  };
}
