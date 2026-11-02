import type { SupabaseClient } from '@supabase/supabase-js';
import { cuenta as textos } from '@/content/cuenta';
import { RUTA_NUEVA_CONTRASENA_CUENTA } from '@/features/panel/acceso/enlaces';
import { avisarCambioCuenta } from './sesion-guardada';
import { normalizarUsuario } from './validacion';

/**
 * Cuentas públicas con Supabase Auth (D-77). El cliente de Supabase se carga solo al usarlo, para
 * que el sitio no pese más. Las contraseñas las guarda y valida Supabase Auth; lo demás lo protegen
 * las políticas RLS de public.cuentas y public.progreso.
 */

export type MotivoError = keyof typeof textos.errores;

export class ErrorCuenta extends Error {
  constructor(readonly motivo: MotivoError) {
    super(textos.errores[motivo]);
    this.name = 'ErrorCuenta';
  }
}

/** Traduce los errores de Supabase Auth a un mensaje claro para la persona. */
export function motivoDeError(error: unknown): MotivoError {
  if (error instanceof ErrorCuenta) return error.motivo;
  const e = (error ?? {}) as { code?: string; status?: number; name?: string; message?: string };
  switch (e.code) {
    case 'user_already_exists':
    case 'email_exists':
      return 'correoTomado';
    case 'invalid_credentials':
      return 'credenciales';
    case 'signup_disabled':
    case 'email_provider_disabled':
      return 'registroCerrado';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'muchosIntentos';
    case 'weak_password':
      return 'contrasenaDebil';
    case 'email_address_invalid':
      return 'correo';
  }
  if (e.name === 'AuthRetryableFetchError' || error instanceof TypeError) return 'conexion';
  // El alta rechazada por la base (por ejemplo, el usuario se tomó un instante antes).
  if (/database error saving new user/i.test(e.message ?? '')) return 'usuarioTomado';
  return 'general';
}

async function cliente(): Promise<SupabaseClient> {
  const { supabase } = await import('@/lib/supabase/cliente');
  if (!supabase) throw new ErrorCuenta('general');
  return supabase;
}

/** Dirección completa de una ruta del sitio (con la carpeta de GitHub Pages). */
const direccion = (ruta: string) =>
  `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}${ruta}`;

export async function usuarioDisponible(usuario: string): Promise<boolean> {
  const supabase = await cliente();
  const { data, error } = await supabase.rpc('usuario_disponible', {
    p_usuario: normalizarUsuario(usuario),
  });
  if (error) throw new ErrorCuenta(motivoDeError(error));
  return data === true;
}

export interface NuevaCuenta {
  nombre: string;
  usuario: string;
  correo: string;
  contrasena: string;
}

/**
 * Crea la cuenta en Supabase Auth; la base de datos crea el perfil con estos datos. La mayoría de
 * edad y la autorización se marcan en el formulario y la base vuelve a exigirlas.
 * Devuelve si la sesión quedó abierta (sin confirmación por correo) o hay que confirmar el correo.
 */
export async function crearCuenta(datos: NuevaCuenta): Promise<{ conSesion: boolean }> {
  if (!(await usuarioDisponible(datos.usuario))) throw new ErrorCuenta('usuarioTomado');
  const supabase = await cliente();
  const { data, error } = await supabase.auth.signUp({
    email: datos.correo.trim(),
    password: datos.contrasena,
    options: {
      emailRedirectTo: direccion('/cuenta'),
      data: {
        tipo: 'cuenta',
        nombre: datos.nombre.trim(),
        usuario: normalizarUsuario(datos.usuario),
        mayor_de_edad: true,
        autoriza_datos: true,
      },
    },
  });
  if (error) throw new ErrorCuenta(motivoDeError(error));
  avisarCambioCuenta();
  return { conSesion: Boolean(data.session) };
}

/** Ingresa con correo y contraseña. El equipo del panel sigue a su verificación en dos pasos. */
export async function ingresar(correo: string, contrasena: string): Promise<'equipo' | 'cuenta'> {
  const supabase = await cliente();
  const { error } = await supabase.auth.signInWithPassword({
    email: correo.trim(),
    password: contrasena,
  });
  if (error) throw new ErrorCuenta(motivoDeError(error));
  avisarCambioCuenta();
  const { data: perfil } = await supabase.rpc('mi_perfil').maybeSingle();
  return perfil ? 'equipo' : 'cuenta';
}

export async function salir(): Promise<void> {
  const supabase = await cliente();
  // Supabase borra la sesión de este navegador aunque falle la llamada de cierre.
  await supabase.auth.signOut();
  avisarCambioCuenta();
}

export async function enviarRecuperacion(correo: string): Promise<void> {
  const supabase = await cliente();
  const { error } = await supabase.auth.resetPasswordForEmail(correo.trim(), {
    redirectTo: direccion(RUTA_NUEVA_CONTRASENA_CUENTA),
  });
  if (error) throw new ErrorCuenta(motivoDeError(error));
}

/** ¿Hay una sesión abierta? Al cargar el cliente también se lee la del enlace de recuperación. */
export async function haySesion(): Promise<boolean> {
  const supabase = await cliente();
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

export async function definirNuevaContrasena(contrasena: string): Promise<void> {
  const supabase = await cliente();
  const { error } = await supabase.auth.updateUser({ password: contrasena });
  if (error) throw new ErrorCuenta(motivoDeError(error));
  avisarCambioCuenta();
}

export interface MiCuenta {
  id: string;
  nombre: string;
  usuario: string;
  correo: string;
  creadoEn: string;
}

export interface ActividadGuardada {
  actividad: string;
  avance: number;
  completado: boolean;
  estado: unknown;
  actualizadoEn: string;
}

export type EstadoMiCuenta =
  | { tipo: 'sin_sesion' }
  | { tipo: 'equipo' }
  | { tipo: 'lista'; cuenta: MiCuenta; progreso: ActividadGuardada[] };

export async function leerMiCuenta(): Promise<EstadoMiCuenta> {
  const supabase = await cliente();
  const { data: sesion, error: errorSesion } = await supabase.auth.getSession();
  if (errorSesion || !sesion.session) {
    avisarCambioCuenta();
    return { tipo: 'sin_sesion' };
  }
  const [perfil, progreso] = await Promise.all([
    supabase.from('cuentas').select('id, nombre, usuario, correo, creado_en').maybeSingle(),
    supabase
      .from('progreso')
      .select('actividad, avance, completado, estado, actualizado_en')
      .order('actualizado_en', { ascending: false }),
  ]);
  if (perfil.error) throw new ErrorCuenta(motivoDeError(perfil.error));
  if (progreso.error) throw new ErrorCuenta(motivoDeError(progreso.error));
  if (!perfil.data) return { tipo: 'equipo' };
  return {
    tipo: 'lista',
    cuenta: {
      id: perfil.data.id,
      nombre: perfil.data.nombre,
      usuario: perfil.data.usuario,
      correo: perfil.data.correo,
      creadoEn: perfil.data.creado_en,
    },
    progreso: progreso.data.map((p) => ({
      actividad: p.actividad,
      avance: p.avance,
      completado: p.completado,
      estado: p.estado,
      actualizadoEn: p.actualizado_en,
    })),
  };
}

/** Guarda el progreso de una actividad en la cuenta de la sesión (public.guardar_progreso). */
export async function guardarProgreso(
  actividad: string,
  datos: { avance: number; completado: boolean; estado: unknown },
): Promise<void> {
  const supabase = await cliente();
  const { error } = await supabase.rpc('guardar_progreso', {
    p_actividad: actividad,
    p_avance: Math.round(Math.min(Math.max(datos.avance, 0), 100)),
    p_completado: datos.completado,
    p_estado: datos.estado,
  });
  if (error) throw new ErrorCuenta(motivoDeError(error));
}

export async function borrarProgreso(actividad: string): Promise<void> {
  const supabase = await cliente();
  const { error } = await supabase.from('progreso').delete().eq('actividad', actividad);
  if (error) throw new ErrorCuenta(motivoDeError(error));
}
