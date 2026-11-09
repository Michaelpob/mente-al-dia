/**
 * Estados del ingreso al panel. Función pura para poder probar cada caso sin Supabase.
 * Se entra con el correo y la contraseña (D-89): basta un perfil activo de administración. Entran
 * el administrador general (superadministrador) y el administrador de cada institución con su
 * institución activa (D-86); los roles antiguos «profesional» y «consulta» ya no entran. La base
 * de datos exige lo mismo por su cuenta.
 */
export type RolPanel =
  'superadministrador' | 'administrador_institucional' | 'profesional' | 'consulta';

export interface InstitucionPerfil {
  id: string;
  nombre: string;
  slug: string;
  activa: boolean;
}

export interface PerfilPanel {
  id: string;
  nombre: string;
  rol: RolPanel;
  activo: boolean;
  /** Solo el administrador institucional tiene institución; el general, ninguna. */
  institucion: InstitucionPerfil | null;
}

export type EstadoSesion =
  | { tipo: 'sin_configurar' }
  | { tipo: 'cargando' }
  | { tipo: 'sin_sesion'; cierre?: CierreSesion }
  | { tipo: 'sin_acceso'; motivo: MotivoSinAcceso }
  | { tipo: 'lista'; perfil: PerfilPanel };

export type MotivoSinAcceso = 'sin_perfil' | 'inactivo' | 'sin_permiso' | 'institucion_inactiva';

/**
 * Cómo se cerró la sesión, cuando la cerró el panel: con «Cerrar sesión» se vuelve a la página
 * principal; por inactividad, al ingreso con el aviso (D-74). Sin valor (nunca hubo sesión, venció
 * o se cerró en otra pestaña), el panel lleva al ingreso.
 */
export type CierreSesion = 'manual' | 'inactividad';

/** Roles que pueden ver el panel (D-65, D-86). */
export const ROLES_PANEL: readonly RolPanel[] = [
  'superadministrador',
  'administrador_institucional',
];

/** ¿Es el administrador general, que ve todas las instituciones? */
export const esGeneral = (perfil: Pick<PerfilPanel, 'rol'> | null | undefined): boolean =>
  perfil?.rol === 'superadministrador';

/** Fila de public.mi_perfil (columnas de la base) tal como llega de Supabase. */
export interface FilaMiPerfil {
  id: string;
  nombre: string;
  rol: RolPanel;
  activo: boolean;
  institucion_id?: string | null;
  institucion_nombre?: string | null;
  institucion_slug?: string | null;
  institucion_activa?: boolean | null;
}

export function perfilDeFila(fila: FilaMiPerfil | null): PerfilPanel | null {
  if (!fila) return null;
  return {
    id: fila.id,
    nombre: fila.nombre,
    rol: fila.rol,
    activo: fila.activo,
    institucion: fila.institucion_id
      ? {
          id: fila.institucion_id,
          nombre: fila.institucion_nombre ?? '',
          slug: fila.institucion_slug ?? '',
          activa: fila.institucion_activa === true,
        }
      : null,
  };
}

export interface DatosSesion {
  haySesion: boolean;
  perfil: PerfilPanel | null;
}

export function resolverEstado({ haySesion, perfil }: DatosSesion): EstadoSesion {
  if (!haySesion) return { tipo: 'sin_sesion' };
  if (!perfil) return { tipo: 'sin_acceso', motivo: 'sin_perfil' };
  if (!perfil.activo) return { tipo: 'sin_acceso', motivo: 'inactivo' };
  if (!ROLES_PANEL.includes(perfil.rol)) return { tipo: 'sin_acceso', motivo: 'sin_permiso' };
  // Un administrador institucional sin institución activa no entra (la base tampoco le responde).
  if (perfil.rol === 'administrador_institucional' && !perfil.institucion?.activa) {
    return { tipo: 'sin_acceso', motivo: 'institucion_inactiva' };
  }
  return { tipo: 'lista', perfil };
}
