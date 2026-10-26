import { areas, dimensiones } from '@/content/v1/areas';
import type { Area, Dimension } from '@/types/dominio';

/** Geometría en un viewBox de 400 × 400. */
export const CENTRO = 200;
const C = CENTRO;
const R_EXT = 190;
export const RADIO_INTERIOR = 106;
const R_INT = RADIO_INTERIOR;
const R_ICONO = 148;
/** Grados libres entre dimensiones y entre áreas de una misma dimensión. */
const HUECO_DIMENSION = 5;
const HUECO_AREA = 1.5;

export interface SegmentoRueda {
  area: Area;
  dimension: Dimension;
  /** Trazado SVG del sector anular. */
  d: string;
  /** Centro del ícono. */
  icono: { x: number; y: number };
}

const punto = (radio: number, grados: number): [number, number] => {
  const rad = (grados * Math.PI) / 180;
  return [C + radio * Math.cos(rad), C + radio * Math.sin(rad)];
};

function sector(a0: number, a1: number): string {
  const f = (n: number) => n.toFixed(2);
  const [x0, y0] = punto(R_EXT, a0);
  const [x1, y1] = punto(R_EXT, a1);
  const [x2, y2] = punto(R_INT, a1);
  const [x3, y3] = punto(R_INT, a0);
  return `M${f(x0)} ${f(y0)}A${R_EXT} ${R_EXT} 0 0 1 ${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}A${R_INT} ${R_INT} 0 0 0 ${f(x3)} ${f(y3)}Z`;
}

/** Las 20 áreas alrededor del círculo, agrupadas por dimensión y empezando arriba. */
export function calcularSegmentos(): SegmentoRueda[] {
  const areaPorId = new Map(areas.map((area) => [area.id, area]));
  const huecos =
    dimensiones.length * HUECO_DIMENSION + (areas.length - dimensiones.length) * HUECO_AREA;
  const paso = (360 - huecos) / areas.length;
  let angulo = -90 + HUECO_DIMENSION / 2;
  const segmentos: SegmentoRueda[] = [];
  dimensiones.forEach((dimension, d) => {
    if (d > 0) angulo += HUECO_DIMENSION - HUECO_AREA;
    dimension.areas.forEach((id, k) => {
      if (k > 0) angulo += HUECO_AREA;
      const area = areaPorId.get(id);
      if (!area) throw new Error(`El área ${id} de la dimensión ${dimension.id} no existe`);
      const [x, y] = punto(R_ICONO, angulo + paso / 2);
      segmentos.push({ area, dimension, d: sector(angulo, angulo + paso), icono: { x, y } });
      angulo += paso;
    });
  });
  return segmentos;
}
