import { clasificarDispositivo, senalesDelNavegador, type TipoDispositivo } from './dispositivo';

/**
 * Cuenta una visita al sitio público (D-80): una por sesión del navegador, con solo el tipo de
 * dispositivo. Se usa fetch y no el cliente de Supabase, así el sitio público no carga ese código
 * (D-45). Si falla, no pasa nada: contar visitas nunca puede estorbar a quien entra.
 */

const CLAVE_SESION = 'mad-visita-registrada';
/** Robots, buscadores y navegadores automatizados no son personas. */
const ROBOT = /bot|crawl|spider|slurp|headless|lighthouse/i;

export interface ConfiguracionVisita {
  /** VITE_SUPABASE_URL */
  url: string | undefined;
  /** VITE_SUPABASE_PUBLISHABLE_KEY */
  clave: string | undefined;
  fetch?: typeof fetch;
  almacen?: Pick<Storage, 'getItem' | 'setItem'> | null;
  dispositivo?: () => TipoDispositivo;
  esAutomatizado?: () => boolean;
}

function almacenDeSesion(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function navegadorAutomatizado(): boolean {
  return navigator.webdriver === true || ROBOT.test(navigator.userAgent ?? '');
}

let registradaEnEstaCarga = false;

/** Devuelve si envió la visita (false si ya estaba contada, falta configuración o es un robot). */
export async function registrarVisita({
  url,
  clave,
  fetch: hacerFetch = (...args) => globalThis.fetch(...args),
  almacen = almacenDeSesion(),
  dispositivo = () => clasificarDispositivo(senalesDelNavegador()),
  esAutomatizado = navegadorAutomatizado,
}: ConfiguracionVisita): Promise<boolean> {
  if (!url || !clave || registradaEnEstaCarga || esAutomatizado()) return false;
  try {
    if (almacen?.getItem(CLAVE_SESION)) return false;
    almacen?.setItem(CLAVE_SESION, '1');
  } catch {
    // Sin almacenamiento (modo privado estricto): se cuenta una vez por carga de la página.
  }
  registradaEnEstaCarga = true;
  try {
    await hacerFetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/registrar_visita`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: clave },
      body: JSON.stringify({ p_dispositivo: dispositivo() }),
      // La visita se envía aunque la persona cambie de página o cierre la pestaña enseguida.
      keepalive: true,
    });
    return true;
  } catch {
    return false;
  }
}

/** Solo para las pruebas: olvida que ya se contó la visita de esta carga. */
export function reiniciarVisitaParaPruebas() {
  registradaEnEstaCarga = false;
}
