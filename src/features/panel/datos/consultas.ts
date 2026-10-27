import { supabase } from '@/lib/supabase/cliente';
import type {
  DatosContacto,
  Ficha,
  FiltrosRegistros,
  FiltrosTablero,
  PaginaRegistros,
  Prioritario,
  Tablero,
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
