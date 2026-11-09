import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/cliente';
import type {
  AdministradorPanel,
  CambioInstitucion,
  Censo,
  DatosContacto,
  ExportacionCenso,
  Ficha,
  FiltrosAuditoria,
  FiltrosCenso,
  FiltrosPersonasCenso,
  FiltrosRegistros,
  FiltrosTablero,
  InstitucionPanel,
  InvitacionAdministrador,
  PaginaAuditoria,
  PaginaCenso,
  PaginaCuentas,
  PaginaRegistros,
  Prioritario,
  ResumenCuentas,
  Tablero,
  Visitas,
} from './tipos';

/**
 * Consultas del panel. Todas son funciones de la base (security definer) que exigen sesión del
 * equipo con doble factor: el navegador no lee tablas de datos personales directamente (D-68).
 *
 * `institucion` (D-86) es la que eligió el administrador general (null: todas). Al administrador
 * institucional la base siempre lo deja en la suya, y si pidiera otra le respondería «sin permiso»:
 * por eso el panel no le manda ninguna.
 */
async function rpc<T>(nombre: string, argumentos?: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.rpc(nombre, argumentos);
  if (error) throw error;
  return data as T;
}

export function obtenerTablero(f: FiltrosTablero, institucion: string | null): Promise<Tablero> {
  return rpc('panel_tablero', {
    p_desde: f.desde,
    p_hasta: f.hasta,
    p_modulo: f.modulo,
    p_lugar: f.lugar,
    p_institucion: institucion,
  });
}

/** Visitas al sitio del periodo por tipo de dispositivo (D-80). Módulo y lugar no aplican. */
export function obtenerVisitas(
  desde: string,
  hasta: string,
  institucion: string | null,
): Promise<Visitas> {
  return rpc('panel_visitas', { p_desde: desde, p_hasta: hasta, p_institucion: institucion });
}

/** Los lugares registrados, para los filtros. Un periodo de un día basta: la lista no depende de él. */
export async function obtenerOpcionesLugar(
  hoy: string,
  institucion: string | null,
): Promise<string[]> {
  const tablero = await rpc<Tablero>('panel_tablero', {
    p_desde: hoy,
    p_hasta: hoy,
    p_institucion: institucion,
  });
  return tablero.opcionesLugar;
}

export function obtenerRegistros(
  f: FiltrosRegistros,
  institucion: string | null,
): Promise<PaginaRegistros> {
  return rpc('panel_registros', {
    p_busqueda: f.q.trim() || null,
    p_desde: f.desde,
    p_hasta: f.hasta,
    p_modulo: f.modulo,
    p_lugar: f.lugar,
    p_resultado: f.resultado,
    p_area: f.area,
    p_nivel: f.nivel,
    p_prioridad: f.prioridad,
    p_estado: f.estado,
    p_orden: f.orden,
    p_descendente: f.descendente,
    p_pagina: f.pagina,
    p_tamano: f.tamano,
    p_institucion: institucion,
  });
}

/** Una ficha de otra institución responde igual que una que no existe (P0002). */
export function obtenerFicha(id: string): Promise<Ficha> {
  return rpc('panel_detalle', { p_aplicacion: id });
}

export function obtenerPrioritarios(institucion: string | null): Promise<Prioritario[]> {
  return rpc('panel_prioritarios', { p_institucion: institucion });
}

export function verDatosContacto(id: string): Promise<DatosContacto> {
  return rpc('ver_datos_contacto', { p_aplicacion: id });
}

export async function registrarImpresion(id: string): Promise<void> {
  await rpc('panel_registrar_impresion', { p_aplicacion: id });
}

/** Cuentas públicas (D-77): totales, actividad y cuentas nuevas por semana. Solo el general. */
export function obtenerResumenCuentas(): Promise<ResumenCuentas> {
  return rpc('panel_cuentas_resumen');
}

/** Censo (D-83): quiénes respondieron y cómo están en cada área, una vez por persona. */
export function obtenerCenso(f: FiltrosCenso, institucion: string | null): Promise<Censo> {
  return rpc('panel_censo', {
    p_desde: f.desde,
    p_hasta: f.hasta,
    p_modulo: f.modulo,
    p_lugar: f.lugar,
    p_institucion: institucion,
  });
}

/** Lista del censo: una fila por persona con sus fortalezas y falencias. */
export function obtenerPersonasCenso(
  f: FiltrosPersonasCenso,
  institucion: string | null,
): Promise<PaginaCenso> {
  return rpc('panel_censo_personas', {
    p_desde: f.desde,
    p_hasta: f.hasta,
    p_modulo: f.modulo,
    p_lugar: f.lugar,
    p_busqueda: f.q.trim() || null,
    p_area: f.area,
    p_nivel: f.nivel,
    p_orden: f.orden,
    p_pagina: f.pagina,
    p_tamano: f.tamano,
    p_institucion: institucion,
  });
}

/**
 * Descarga del censo (D-84): todas las personas del filtro, para el Excel, con un motivo; la base
 * deja la descarga en la auditoría antes de devolver los datos. Cada administrador institucional
 * descarga solo su institución (D-86).
 */
export function exportarCenso(
  f: FiltrosCenso,
  motivo: string,
  institucion: string | null,
): Promise<ExportacionCenso> {
  return rpc('panel_censo_exportar', {
    p_motivo: motivo,
    p_desde: f.desde,
    p_hasta: f.hasta,
    p_modulo: f.modulo,
    p_lugar: f.lugar,
    p_institucion: institucion,
  });
}

export function obtenerCuentas(busqueda: string, pagina: number): Promise<PaginaCuentas> {
  return rpc('panel_cuentas', {
    p_busqueda: busqueda.trim() || null,
    p_pagina: pagina,
    p_tamano: 25,
  });
}

// ---------------------------------------------------------------------------------- instituciones (D-86)

/** Las instituciones con su actividad del periodo (sin fechas: todo el historial). */
export function obtenerInstituciones(
  desde: string | null,
  hasta: string | null,
): Promise<InstitucionPanel[]> {
  return rpc('panel_instituciones', { p_desde: desde, p_hasta: hasta });
}

/** Solo el general: nombre, enlace o estado. Queda en la auditoría. */
export function actualizarInstitucion(cambio: CambioInstitucion): Promise<CambioInstitucion> {
  return rpc('panel_institucion_actualizar', {
    p_id: cambio.id,
    p_nombre: cambio.nombre,
    p_slug: cambio.slug,
    p_activa: cambio.activa,
  });
}

export function obtenerAdministradores(): Promise<AdministradorPanel[]> {
  return rpc('panel_administradores');
}

/** Activa o desactiva a un administrador institucional, o lo pasa a otra institución. */
export async function actualizarAdministrador(
  id: string,
  activo: boolean,
  institucion: string | null,
): Promise<void> {
  await rpc('panel_administrador_actualizar', {
    p_id: id,
    p_activo: activo,
    p_institucion: institucion,
  });
}

export type CodigoInvitacion =
  | 'conflicto'
  | 'institucion_invalida'
  | 'entrada_invalida'
  | 'sin_permiso'
  | 'sin_sesion'
  | 'error';

export class ErrorInvitacion extends Error {
  constructor(
    readonly codigo: CodigoInvitacion,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorInvitacion';
  }
}

const CODIGOS_INVITACION: readonly CodigoInvitacion[] = [
  'conflicto',
  'institucion_invalida',
  'entrada_invalida',
  'sin_permiso',
  'sin_sesion',
];

/**
 * Invitación por correo (Edge Function invitar-usuario): la persona recibe un enlace para definir
 * su contraseña y su doble factor. El rol y la institución los decide el servidor, no el correo.
 */
export async function invitarAdministrador(invitacion: InvitacionAdministrador): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { error } = await supabase.functions.invoke('invitar-usuario', { body: invitacion });
  if (!error) return;
  let codigo: CodigoInvitacion = 'error';
  if (error instanceof FunctionsHttpError) {
    try {
      const cuerpo = (await (error.context as Response).json()) as {
        error?: { codigo?: string };
      };
      const recibido = cuerpo.error?.codigo as CodigoInvitacion | undefined;
      if (recibido && CODIGOS_INVITACION.includes(recibido)) codigo = recibido;
    } catch {
      // Sin cuerpo legible: queda como error general.
    }
  }
  throw new ErrorInvitacion(codigo, error.message);
}

/** Auditoría (solo el general): filtros de fecha y acción, más la institución elegida. */
export function obtenerAuditoria(
  f: FiltrosAuditoria,
  institucion: string | null,
): Promise<PaginaAuditoria> {
  return rpc('panel_auditoria', {
    p_institucion: institucion,
    p_desde: f.desde,
    p_hasta: f.hasta,
    p_accion: f.accion,
    p_pagina: f.pagina,
    p_tamano: 50,
  });
}
