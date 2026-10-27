/**
 * Estados del ingreso al panel. Función pura para poder probar cada caso sin Supabase.
 * El orden importa: primero se confirma que la cuenta tiene un perfil activo de administración y
 * luego se exige el doble factor, para no pedir a alguien sin acceso que configure una aplicación
 * de autenticación. El panel es solo para el superadministrador (D-65).
 * La base de datos exige lo mismo por su cuenta (políticas con aal2).
 */
export type RolPanel = 'superadministrador' | 'profesional' | 'consulta';

export interface PerfilPanel {
  id: string;
  nombre: string;
  rol: RolPanel;
  activo: boolean;
}

export type EstadoSesion =
  | { tipo: 'sin_configurar' }
  | { tipo: 'cargando' }
  | { tipo: 'sin_sesion'; cierre?: CierreSesion }
  | { tipo: 'sin_acceso'; motivo: MotivoSinAcceso }
  | { tipo: 'inscribir_doble_factor' }
  | { tipo: 'verificar_doble_factor'; factorId: string }
  | { tipo: 'lista'; perfil: PerfilPanel };

export type MotivoSinAcceso = 'sin_perfil' | 'inactivo' | 'sin_permiso';

/**
 * Cómo se cerró la sesión, cuando la cerró el panel: con «Cerrar sesión» se vuelve a la página
 * principal; por inactividad, al ingreso con el aviso (D-74). Sin valor (nunca hubo sesión, venció
 * o se cerró en otra pestaña), el panel lleva al ingreso.
 */
export type CierreSesion = 'manual' | 'inactividad';

/** Único rol que puede ver el panel (D-65). */
export const ROL_PANEL: RolPanel = 'superadministrador';

export interface DatosSesion {
  haySesion: boolean;
  /** Nivel de autenticación de la sesión: aal1 (contraseña) o aal2 (con doble factor). */
  nivel: string | null;
  /** Factores TOTP ya verificados de la cuenta. */
  factoresVerificados: readonly string[];
  perfil: PerfilPanel | null;
}

export function resolverEstado({
  haySesion,
  nivel,
  factoresVerificados,
  perfil,
}: DatosSesion): EstadoSesion {
  if (!haySesion) return { tipo: 'sin_sesion' };
  if (!perfil) return { tipo: 'sin_acceso', motivo: 'sin_perfil' };
  if (!perfil.activo) return { tipo: 'sin_acceso', motivo: 'inactivo' };
  if (perfil.rol !== ROL_PANEL) return { tipo: 'sin_acceso', motivo: 'sin_permiso' };
  if (nivel === 'aal2') return { tipo: 'lista', perfil };
  const [factorId] = factoresVerificados;
  return factorId
    ? { tipo: 'verificar_doble_factor', factorId }
    : { tipo: 'inscribir_doble_factor' };
}
