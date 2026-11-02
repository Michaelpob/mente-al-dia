import { useSyncExternalStore } from 'react';

/**
 * La cuenta pública con sesión en este navegador, leída de lo que guarda Supabase Auth sin cargar
 * su cliente: así el encabezado muestra el nombre en todas las páginas sin sumarles peso (D-77).
 * La sesión real (y su renovación) la maneja el cliente cuando una página lo necesita.
 */
export interface CuentaGuardada {
  id: string;
  nombre: string;
  usuario: string;
}

/** Clave con la que supabase-js guarda la sesión: sb-<referencia del proyecto>-auth-token. */
export function claveSesion(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
  } catch {
    return null;
  }
}

/** Solo las cuentas creadas desde «Crear cuenta» (tipo «cuenta»); el equipo del panel no cuenta. */
export function leerCuentaGuardada(crudo: string | null): CuentaGuardada | null {
  if (!crudo) return null;
  try {
    const sesion = JSON.parse(crudo) as {
      user?: { id?: unknown; user_metadata?: Record<string, unknown> };
    } | null;
    const usuario = sesion?.user;
    const datos = usuario?.user_metadata;
    if (datos?.tipo !== 'cuenta' || typeof usuario?.id !== 'string') return null;
    return {
      id: usuario.id,
      nombre: typeof datos.nombre === 'string' ? datos.nombre : '',
      usuario: typeof datos.usuario === 'string' ? datos.usuario : '',
    };
  } catch {
    return null;
  }
}

const CLAVE = claveSesion(import.meta.env.VITE_SUPABASE_URL);
const EVENTO_CUENTA = 'mente-al-dia:cuenta';

/** Avisa a esta pestaña que la sesión cambió (localStorage solo avisa a las demás pestañas). */
export function avisarCambioCuenta() {
  window.dispatchEvent(new Event(EVENTO_CUENTA));
}

function leerCrudo(): string | null {
  if (!CLAVE) return null;
  try {
    return window.localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

function suscribir(avisar: () => void) {
  window.addEventListener('storage', avisar);
  window.addEventListener(EVENTO_CUENTA, avisar);
  return () => {
    window.removeEventListener('storage', avisar);
    window.removeEventListener(EVENTO_CUENTA, avisar);
  };
}

// La misma cuenta mientras no cambie lo guardado: useSyncExternalStore pide un valor estable.
let ultimoCrudo: string | null = null;
let ultimaCuenta: CuentaGuardada | null = null;
function instantanea(): CuentaGuardada | null {
  const crudo = leerCrudo();
  if (crudo !== ultimoCrudo) {
    ultimoCrudo = crudo;
    ultimaCuenta = leerCuentaGuardada(crudo);
  }
  return ultimaCuenta;
}

export function useCuentaGuardada(): CuentaGuardada | null {
  return useSyncExternalStore(suscribir, instantanea, () => null);
}
