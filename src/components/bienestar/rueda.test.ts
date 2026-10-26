import { describe, expect, it } from 'vitest';
import { areas, dimensiones } from '@/content/v1/areas';
import { calcularSegmentos } from './geometria-rueda';
import { iconosAreas, tonoDimension } from './iconos-areas';

describe('íconos y tonos de la rueda', () => {
  it('cada área tiene su ícono', () => {
    const sinIcono = areas.filter((area) => !iconosAreas[area.icono]).map((area) => area.icono);
    expect(sinIcono).toEqual([]);
  });

  it('cada dimensión tiene su tono', () => {
    for (const dimension of dimensiones) expect(tonoDimension[dimension.id]).toBeTruthy();
  });
});

describe('geometría de la rueda', () => {
  it('reparte las 20 áreas en orden de dimensión, sin repetir', () => {
    const segmentos = calcularSegmentos();
    expect(segmentos).toHaveLength(areas.length);
    expect(new Set(segmentos.map((s) => s.area.id)).size).toBe(areas.length);
    expect(segmentos.map((s) => s.area.id)).toEqual(dimensiones.flatMap((d) => d.areas));
  });
});
