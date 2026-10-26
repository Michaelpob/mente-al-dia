import { participar } from '@/content/participar';
import { areas } from '@/content/v1/areas';
import {
  frasesGuia,
  mensajesAdulto,
  mensajesGenerales,
  mensajesNinoPorNivel,
} from '@/content/v1/mensajes';
import type { ModuloDisponible } from '@/features/participar/modelo';
import type { Area, AreaId, ConteoNiveles, Nivel, ResultadoGeneral } from '@/types/dominio';

/** Cómo se presentan los resultados (Fase 7). Funciones puras, con pruebas. */

/** Orden de los grupos: lo que más cuidado necesita va primero. */
export const ORDEN_NIVELES: readonly Nivel[] = [
  'requiere_atencion',
  'por_fortalecer',
  'adecuado',
  'sin_dato',
];

/** Nivel de un área; si no llegó (resultado incompleto), «sin dato». */
export const nivelDe = (niveles: Partial<Record<AreaId, Nivel>>, areaId: AreaId): Nivel =>
  niveles[areaId] ?? 'sin_dato';

/** Mensaje de un área según el módulo y el nivel (Anexo D). */
export function mensajeDeArea(modulo: ModuloDisponible, areaId: AreaId, nivel: Nivel): string {
  if (nivel === 'sin_dato') return mensajesGenerales.sinDatoArea;
  return modulo === 'nino' ? mensajesNinoPorNivel[nivel] : mensajesAdulto[areaId][nivel];
}

export function mensajeGeneral(modulo: ModuloDisponible, general: ResultadoGeneral): string {
  return general === 'insuficiente'
    ? mensajesGenerales.insuficiente
    : mensajesGenerales[modulo][general];
}

const fraseDe: Record<ResultadoGeneral, string> = {
  favorable: frasesGuia[0],
  por_fortalecer: frasesGuia[1],
  desafios: frasesGuia[3],
  insuficiente: frasesGuia[2],
};

export const fraseGuia = (general: ResultadoGeneral) => fraseDe[general];

export interface GrupoNivel {
  nivel: Nivel;
  areas: Area[];
}

/** Las 20 áreas agrupadas por nivel, en ORDEN_NIVELES, sin grupos vacíos. */
export function gruposPorNivel(niveles: Partial<Record<AreaId, Nivel>>): GrupoNivel[] {
  return ORDEN_NIVELES.map((nivel) => ({
    nivel,
    areas: areas
      .filter((area) => nivelDe(niveles, area.id) === nivel)
      .sort((a, b) => a.numero - b.numero),
  })).filter((grupo) => grupo.areas.length > 0);
}

/** «12 fortalezas, 5 por fortalecer y 2 para cuidar primero. 1 sin dato» */
export function resumenConteo(conteo: ConteoNiveles): string {
  const r = participar.resultados.resumen;
  const partes = [
    conteo.adecuado ? r.fortaleza(conteo.adecuado) : null,
    conteo.porFortalecer ? r.porFortalecer(conteo.porFortalecer) : null,
    conteo.requiereAtencion ? r.cuidarPrimero(conteo.requiereAtencion) : null,
  ].filter((parte): parte is string => parte !== null);
  const lista =
    partes.length > 1
      ? `${partes.slice(0, -1).join(', ')} y ${partes.at(-1) ?? ''}`
      : partes.join('');
  const sinDato = conteo.sinDato ? r.sinDato(conteo.sinDato) : '';
  return [lista, sinDato].filter(Boolean).join('. ');
}

/** Fecha larga en español de Colombia, o null si no hay fecha válida. */
export function fechaLarga(iso: string | undefined): string | null {
  if (!iso) return null;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(fecha);
}
