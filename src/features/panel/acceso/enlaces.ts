/**
 * Enlaces de invitación y de recuperación de contraseña (D-67). Este archivo no importa el cliente
 * de Supabase: el enrutador lo usa en todas las páginas.
 */

/** Ruta a la que llevan los enlaces de invitación y de recuperación de contraseña. */
export const RUTA_DEFINIR_CONTRASENA = '/panel/definir-contrasena';

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

  const destino = `${base.replace(/\/$/, '')}${RUTA_DEFINIR_CONTRASENA}`;
  if (ruta.replace(/\/$/, '') === destino) return null;
  return `${destino}${fragmento}`;
}
