/**
 * Enlaces de invitación y de recuperación de contraseña (D-67). Este archivo no importa el cliente
 * de Supabase: el enrutador lo usa en todas las páginas.
 */

/** Ruta a la que llevan los enlaces de invitación y de recuperación de contraseña. */
export const RUTA_DEFINIR_CONTRASENA = '/panel/definir-contrasena';

/** Destino de los enlaces de recuperación que se piden desde una cuenta pública (D-77). */
export const RUTA_NUEVA_CONTRASENA_CUENTA = '/cuenta/nueva-contrasena';

/**
 * Dirección completa de /panel/definir-contrasena, con la carpeta del sitio (en GitHub Pages,
 * /mente-al-dia). Tiene que estar en las Redirect URLs de Auth (supabase/config.toml).
 */
export function direccionDefinirContrasena(origen: string, base: string): string {
  return `${origen}${base.replace(/\/$/, '')}${RUTA_DEFINIR_CONTRASENA}`;
}

/**
 * Un enlace de invitación o de recuperación sin destino propio (por ejemplo, una invitación enviada
 * desde el panel de Supabase, que usa la dirección del sitio) llega a otra página con la sesión en
 * el fragmento: «#access_token=…&type=invite». Un enlace vencido trae «#error_code=…».
 * Devuelve la ruta de /panel/definir-contrasena con el mismo fragmento, o null si no hace falta.
 */
export function redirigirEnlaceDeAcceso(
  ruta: string,
  fragmento: string,
  base: string,
): string | null {
  const datos = new URLSearchParams(fragmento.replace(/^#/, ''));
  const esEnlace =
    ['invite', 'recovery'].includes(datos.get('type') ?? '') || datos.has('error_code');
  if (!esEnlace) return null;

  const carpeta = base.replace(/\/$/, '');
  const destino = `${carpeta}${RUTA_DEFINIR_CONTRASENA}`;
  // Los enlaces que ya llegan a una página que los recibe (la del panel o la de las cuentas) se quedan.
  const recibidas = [destino, `${carpeta}${RUTA_NUEVA_CONTRASENA_CUENTA}`];
  if (recibidas.includes(ruta.replace(/\/$/, ''))) return null;
  return `${destino}${fragmento}`;
}
