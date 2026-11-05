import { supabase } from '@/lib/supabase/cliente';
import type {
  Censo,
  DatosContacto,
  ExportacionCenso,
  Ficha,
  FiltrosCenso,
  FiltrosPersonasCenso,
  FiltrosRegistros,
  FiltrosTablero,
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
 */
async function rpc<T>(nombre: string, argumentos?: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.rpc(nombre, argumentos);
  if (error) throw error;
  return data as T;
}

export function obtenerTablero(f: FiltrosTablero): Promise<Tablero> {
  return rpc('panel_tablero', {
    p_desde: f.desde,
    p_hasta: f.hasta,
    p_modulo: f.modulo,
    p_lugar: f.lugar,
  });
}

/** Visitas al sitio del periodo por tipo de dispositivo (D-80). Módulo y lugar no aplican. */
export function obtenerVisitas(desde: string, hasta: string): Promise<Visitas> {
  return rpc('panel_visitas', { p_desde: desde, p_hasta: hasta });
}

/** Los lugares registrados, para los filtros. Un periodo de un día basta: la lista no depende de él. */
export async function obtenerOpcionesLugar(hoy: string): Promise<string[]> {
  const tablero = await rpc<Tablero>('panel_tablero', { p_desde: hoy, p_hasta: hoy });
  return tablero.opcionesLugar;
}

export function obtenerRegistros(f: FiltrosRegistros): Promise<PaginaRegistros> {
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
  });
}

export function obtenerFicha(id: string): Promise<Ficha> {
  return rpc('panel_detalle', { p_aplicacion: id });
}

export function obtenerPrioritarios(): Promise<Prioritario[]> {
  return rpc('panel_prioritarios');
}

export function verDatosContacto(id: string): Promise<DatosContacto> {
  return rpc('ver_datos_contacto', { p_aplicacion: id });
}

export async function registrarImpresion(id: string): Promise<void> {
  await rpc('panel_registrar_impresion', { p_aplicacion: id });
}

/** Cuentas públicas (D-77): totales, actividad y cuentas nuevas por semana. */
export function obtenerResumenCuentas(): Promise<ResumenCuentas> {
  return rpc('panel_cuentas_resumen');
}

/** Censo (D-83): quiénes respondieron y cómo están en cada área, una vez por persona. */
export function obtenerCenso(f: FiltrosCenso): Promise<Censo> {
  return rpc('panel_censo', {
    p_desde: f.desde,
    p_hasta: f.hasta,
    p_modulo: f.modulo,
    p_lugar: f.lugar,
  });
}

/** Lista del censo: una fila por persona con sus fortalezas y falencias. */
export function obtenerPersonasCenso(f: FiltrosPersonasCenso): Promise<PaginaCenso> {
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
  });
}

/**
 * Descarga del censo (D-84): todas las personas del filtro, para el Excel. Solo superadministración,
 * con un motivo; la base deja la descarga en la auditoría antes de devolver los datos.
 */
export function exportarCenso(f: FiltrosCenso, motivo: string): Promise<ExportacionCenso> {
  return rpc('panel_censo_exportar', {
    p_motivo: motivo,
    p_desde: f.desde,
    p_hasta: f.hasta,
    p_modulo: f.modulo,
    p_lugar: f.lugar,
  });
}

export function obtenerCuentas(busqueda: string, pagina: number): Promise<PaginaCuentas> {
  return rpc('panel_cuentas', {
    p_busqueda: busqueda.trim() || null,
    p_pagina: pagina,
    p_tamano: 25,
  });
}
