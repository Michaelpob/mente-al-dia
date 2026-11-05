import { areas } from '@/content/v1/areas';
import type { AreaId, Modulo, Nivel } from '@/types/dominio';
import {
  ORDENES,
  ORDENES_CENSO,
  type EstadoSeguimiento,
  type FiltrosPersonasCenso,
  type FiltrosRegistros,
  type FiltrosTablero,
  type OrdenRegistros,
  type ResultadoGeneral,
} from './tipos';

/**
 * Filtros del panel en la dirección (?desde=…&modulo=…): una vista se puede recargar o compartir
 * dentro del equipo. Lo que no es válido se ignora, nunca se envía a la base tal cual.
 */

export const ZONA_HORARIA = 'America/Bogota';
export const PERIODOS = [7, 30, 90, 365] as const;
export const PERIODO_POR_DEFECTO = 30;
export const TAMANOS = [25, 50, 100] as const;

/** Módulos con cuestionario, en el orden de los filtros del panel. */
export const MODULOS: readonly Modulo[] = ['adulto', 'adolescente', 'nino'];

/** El módulo elegido en un filtro, o null para «Todos». */
export const moduloDeFiltro = (valor: string): Modulo | null =>
  MODULOS.find((m) => m === valor) ?? null;
const RESULTADOS: readonly ResultadoGeneral[] = [
  'favorable',
  'por_fortalecer',
  'desafios',
  'insuficiente',
];
const NIVELES: readonly Nivel[] = ['adecuado', 'por_fortalecer', 'requiere_atencion', 'sin_dato'];
const ESTADOS: readonly EstadoSeguimiento[] = [
  'pendiente',
  'en_contacto',
  'orientado',
  'remitido',
  'cerrado',
];
const AREAS = areas.map((a) => a.id) as readonly AreaId[];

const elegir = <T extends string>(valor: string | null, opciones: readonly T[]): T | null =>
  valor !== null && (opciones as readonly string[]).includes(valor) ? (valor as T) : null;

/** El día de hoy en Colombia, AAAA-MM-DD. */
export function hoyEnColombia(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(ahora);
}

/** Suma días a una fecha AAAA-MM-DD, sin depender de la zona horaria del navegador. */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function fechaValida(valor: string | null): string | null {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const d = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valor ? valor : null;
}

function textoLimpio(valor: string | null, maximo = 120): string | null {
  const t = valor?.trim().slice(0, maximo);
  return t ? t : null;
}

// ---------------------------------------------------------------------------------- tablero

export function tableroPorDefecto(hoy: string): FiltrosTablero {
  return { desde: sumarDias(hoy, 1 - PERIODO_POR_DEFECTO), hasta: hoy, modulo: null, lugar: null };
}

export function leerFiltrosTablero(params: URLSearchParams, hoy: string): FiltrosTablero {
  const base = tableroPorDefecto(hoy);
  const desde = fechaValida(params.get('desde'));
  const hasta = fechaValida(params.get('hasta'));
  const periodoValido = desde !== null && hasta !== null && desde <= hasta;
  return {
    desde: periodoValido ? desde : base.desde,
    hasta: periodoValido ? hasta : base.hasta,
    modulo: elegir(params.get('modulo'), MODULOS),
    lugar: textoLimpio(params.get('lugar')),
  };
}

export function escribirFiltrosTablero(f: FiltrosTablero, hoy: string): URLSearchParams {
  const base = tableroPorDefecto(hoy);
  const p = new URLSearchParams();
  if (f.desde !== base.desde || f.hasta !== base.hasta) {
    p.set('desde', f.desde);
    p.set('hasta', f.hasta);
  }
  if (f.modulo) p.set('modulo', f.modulo);
  if (f.lugar) p.set('lugar', f.lugar);
  return p;
}

/** El periodo predefinido que coincide con las fechas, o «personalizado». */
export function periodoDe(
  f: Pick<FiltrosTablero, 'desde' | 'hasta'>,
  hoy: string,
): number | 'personalizado' {
  if (f.hasta !== hoy) return 'personalizado';
  return PERIODOS.find((n) => f.desde === sumarDias(hoy, 1 - n)) ?? 'personalizado';
}

/** Cambio porcentual frente al periodo anterior; null si antes no hubo aplicaciones. */
export function variacion(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

// ---------------------------------------------------------------------------------- registros

export const REGISTROS_POR_DEFECTO: FiltrosRegistros = {
  q: '',
  desde: null,
  hasta: null,
  modulo: null,
  lugar: null,
  resultado: null,
  area: null,
  nivel: null,
  prioridad: null,
  estado: null,
  orden: 'fecha',
  descendente: true,
  pagina: 1,
  tamano: 25,
};

export function leerFiltrosRegistros(params: URLSearchParams): FiltrosRegistros {
  const d = REGISTROS_POR_DEFECTO;
  let desde = fechaValida(params.get('desde'));
  let hasta = fechaValida(params.get('hasta'));
  if (desde && hasta && desde > hasta) [desde, hasta] = [hasta, desde];
  const area = elegir(params.get('area'), AREAS);
  const nivel = elegir(params.get('nivel'), NIVELES);
  const pagina = Number.parseInt(params.get('pagina') ?? '', 10);
  const tamano = Number.parseInt(params.get('tamano') ?? '', 10);
  const prioridad = params.get('prioridad');
  return {
    q: textoLimpio(params.get('q')) ?? '',
    desde,
    hasta,
    modulo: elegir(params.get('modulo'), MODULOS),
    lugar: textoLimpio(params.get('lugar')),
    resultado: elegir(params.get('resultado'), RESULTADOS),
    // El área solo filtra junto con un nivel, como en la base.
    area: area && nivel ? area : null,
    nivel: area && nivel ? nivel : null,
    prioridad: prioridad === 'si' ? true : prioridad === 'no' ? false : null,
    estado: elegir(params.get('estado'), ESTADOS),
    orden: elegir(params.get('orden'), ORDENES as readonly OrdenRegistros[]) ?? d.orden,
    descendente: params.get('dir') === 'asc' ? false : d.descendente,
    pagina: Number.isFinite(pagina) && pagina >= 1 ? pagina : d.pagina,
    tamano: (TAMANOS as readonly number[]).includes(tamano) ? tamano : d.tamano,
  };
}

export function escribirFiltrosRegistros(f: FiltrosRegistros): URLSearchParams {
  const d = REGISTROS_POR_DEFECTO;
  const p = new URLSearchParams();
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.desde) p.set('desde', f.desde);
  if (f.hasta) p.set('hasta', f.hasta);
  if (f.modulo) p.set('modulo', f.modulo);
  if (f.lugar) p.set('lugar', f.lugar);
  if (f.resultado) p.set('resultado', f.resultado);
  if (f.area && f.nivel) {
    p.set('area', f.area);
    p.set('nivel', f.nivel);
  }
  if (f.prioridad !== null) p.set('prioridad', f.prioridad ? 'si' : 'no');
  if (f.estado) p.set('estado', f.estado);
  if (f.orden !== d.orden) p.set('orden', f.orden);
  if (f.descendente !== d.descendente) p.set('dir', f.descendente ? 'desc' : 'asc');
  if (f.pagina !== d.pagina) p.set('pagina', String(f.pagina));
  if (f.tamano !== d.tamano) p.set('tamano', String(f.tamano));
  return p;
}

/** ¿Hay algún filtro aplicado, además de la búsqueda y el orden? */
export function hayFiltros(f: FiltrosRegistros): boolean {
  return Boolean(
    f.desde ||
    f.hasta ||
    f.modulo ||
    f.lugar ||
    f.resultado ||
    f.area ||
    f.prioridad !== null ||
    f.estado,
  );
}

// ---------------------------------------------------------------------------------- censo

/** Por defecto el censo cuenta todo el historial, con quien tiene más falencias primero. */
export const CENSO_POR_DEFECTO: FiltrosPersonasCenso = {
  desde: null,
  hasta: null,
  modulo: null,
  lugar: null,
  q: '',
  area: null,
  nivel: null,
  orden: 'falencias',
  pagina: 1,
  tamano: 25,
};

export function leerFiltrosCenso(params: URLSearchParams): FiltrosPersonasCenso {
  const d = CENSO_POR_DEFECTO;
  let desde = fechaValida(params.get('desde'));
  let hasta = fechaValida(params.get('hasta'));
  if (desde && hasta && desde > hasta) [desde, hasta] = [hasta, desde];
  const area = elegir(params.get('area'), AREAS);
  const nivel = elegir(params.get('nivel'), NIVELES);
  const pagina = Number.parseInt(params.get('pagina') ?? '', 10);
  const tamano = Number.parseInt(params.get('tamano') ?? '', 10);
  return {
    desde,
    hasta,
    modulo: elegir(params.get('modulo'), MODULOS),
    lugar: textoLimpio(params.get('lugar')),
    q: textoLimpio(params.get('q')) ?? '',
    // Como en la base, el área solo filtra junto con un nivel.
    area: area && nivel ? area : null,
    nivel: area && nivel ? nivel : null,
    orden: elegir(params.get('orden'), ORDENES_CENSO) ?? d.orden,
    pagina: Number.isFinite(pagina) && pagina >= 1 ? pagina : d.pagina,
    tamano: (TAMANOS as readonly number[]).includes(tamano) ? tamano : d.tamano,
  };
}

/** Periodos del censo: todo el historial o los últimos días que terminan hoy. */
export const PERIODOS_CENSO = [30, 90, 365] as const;

/** El periodo del censo que coincide con las fechas: «todo», uno predefinido o «personalizado». */
export function periodoCensoDe(
  f: Pick<FiltrosPersonasCenso, 'desde' | 'hasta'>,
  hoy: string,
): 'todo' | (typeof PERIODOS_CENSO)[number] | 'personalizado' {
  if (!f.desde && !f.hasta) return 'todo';
  if (f.hasta !== hoy) return 'personalizado';
  return PERIODOS_CENSO.find((n) => f.desde === sumarDias(hoy, 1 - n)) ?? 'personalizado';
}

export function escribirFiltrosCenso(f: FiltrosPersonasCenso): URLSearchParams {
  const d = CENSO_POR_DEFECTO;
  const p = new URLSearchParams();
  if (f.desde) p.set('desde', f.desde);
  if (f.hasta) p.set('hasta', f.hasta);
  if (f.modulo) p.set('modulo', f.modulo);
  if (f.lugar) p.set('lugar', f.lugar);
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.area && f.nivel) {
    p.set('area', f.area);
    p.set('nivel', f.nivel);
  }
  if (f.orden !== d.orden) p.set('orden', f.orden);
  if (f.pagina !== d.pagina) p.set('pagina', String(f.pagina));
  if (f.tamano !== d.tamano) p.set('tamano', String(f.tamano));
  return p;
}
