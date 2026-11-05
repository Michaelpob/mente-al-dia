import { describe, expect, it } from 'vitest';
import type { AreaId, Nivel } from '@/types/dominio';
import {
  cambiosFrenteAnterior,
  conteoDePersona,
  fraccion,
  gruposDePersona,
  masComunes,
  ordenarAreas,
  ordenarGrados,
  porDimension,
  resumenAreas,
} from './analisis';

const datos = [
  { area: 'bienestar_emocional' as AreaId, nivel: 'adecuado' as Nivel, n: 1 },
  { area: 'bienestar_emocional' as AreaId, nivel: 'requiere_atencion' as Nivel, n: 3 },
  { area: 'sueno_descanso' as AreaId, nivel: 'adecuado' as Nivel, n: 4 },
  { area: 'red_apoyo' as AreaId, nivel: 'requiere_atencion' as Nivel, n: 1 },
  { area: 'red_apoyo' as AreaId, nivel: 'por_fortalecer' as Nivel, n: 1 },
];

describe('resumen del censo por área', () => {
  it('trae las 20 áreas en el orden del cuestionario, con cero donde no hay nadie', () => {
    const resumen = resumenAreas(datos);
    expect(resumen).toHaveLength(20);
    expect(resumen[0]!.area.id).toBe('bienestar_emocional');
    expect(resumen[0]!.conteo).toEqual({
      adecuado: 1,
      por_fortalecer: 0,
      requiere_atencion: 3,
      sin_dato: 0,
    });
    expect(resumen[0]!.total).toBe(4);
    expect(resumen.find((r) => r.area.id === 'concentracion')!.total).toBe(0);
  });

  it('ordena por la parte de falencias o de fortalezas, no por el número', () => {
    const resumen = resumenAreas(datos);
    // Bienestar emocional: 3 de 4 (75 %); red de apoyo: 1 de 2 (50 %).
    expect(
      ordenarAreas(resumen, 'falencias')
        .slice(0, 2)
        .map((r) => r.area.id),
    ).toEqual(['bienestar_emocional', 'red_apoyo']);
    expect(ordenarAreas(resumen, 'fortalezas')[0]!.area.id).toBe('sueno_descanso');
    expect(ordenarAreas(resumen, 'cuestionario').map((r) => r.area.numero)).toEqual(
      [...resumen].map((r) => r.area.numero),
    );
    expect(
      fraccion(
        resumen.find((r) => r.area.id === 'concentracion')!,
        'adecuado',
      ),
    ).toBe(0);
  });

  it('las más comunes dejan fuera las áreas sin nadie en ese nivel', () => {
    const resumen = resumenAreas(datos);
    expect(masComunes(resumen, 'requiere_atencion').map((r) => r.area.id)).toEqual([
      'bienestar_emocional',
      'red_apoyo',
    ]);
    expect(masComunes(resumen, 'adecuado', 1).map((r) => r.area.id)).toEqual(['sueno_descanso']);
  });

  it('ordena los grados como en el colegio y deja al final los desconocidos', () => {
    expect(
      ordenarGrados([
        { grado: 'Décimo', n: 1 },
        { grado: 'Otro', n: 5 },
        { grado: 'cuarto', n: 2 },
        { grado: 'Transición', n: 1 },
      ]).map((g) => g.grado),
    ).toEqual(['Transición', 'cuarto', 'Décimo', 'Otro']);
  });
});

describe('fortalezas y falencias de una persona', () => {
  const niveles: Partial<Record<AreaId, Nivel>> = {
    bienestar_emocional: 'requiere_atencion',
    sueno_descanso: 'adecuado',
    red_apoyo: 'por_fortalecer',
  };

  it('agrupa primero las falencias y siempre muestra los tres grupos principales', () => {
    const grupos = gruposDePersona({ sueno_descanso: 'adecuado' });
    // Las 19 áreas sin nivel van a «sin dato»: el grupo aparece porque no está vacío.
    expect(grupos.map((g) => [g.nivel, g.areas.length])).toEqual([
      ['requiere_atencion', 0],
      ['por_fortalecer', 0],
      ['adecuado', 1],
      ['sin_dato', 19],
    ]);
  });

  it('sin áreas sin dato no muestra ese grupo', () => {
    const completo = Object.fromEntries(
      resumenAreas([]).map((r) => [r.area.id, 'adecuado']),
    ) as Partial<Record<AreaId, Nivel>>;
    expect(gruposDePersona(completo).map((g) => g.nivel)).toEqual([
      'requiere_atencion',
      'por_fortalecer',
      'adecuado',
    ]);
  });

  it('cuenta sus niveles y los reparte por dimensión', () => {
    expect(conteoDePersona(niveles)).toEqual({
      adecuado: 1,
      por_fortalecer: 1,
      requiere_atencion: 1,
      sin_dato: 17,
    });
    const dimensiones = porDimension(niveles);
    expect(dimensiones).toHaveLength(5);
    expect(dimensiones.find((d) => d.dimension.id === 'emociones_mente')!.conteo).toEqual({
      adecuado: 0,
      por_fortalecer: 0,
      requiere_atencion: 1,
      sin_dato: 3,
    });
  });

  it('compara con el cuestionario anterior sin contar las áreas sin dato', () => {
    const { mejoras, retrocesos } = cambiosFrenteAnterior(niveles, {
      bienestar_emocional: 'adecuado',
      sueno_descanso: 'requiere_atencion',
      red_apoyo: 'por_fortalecer',
      concentracion: 'adecuado',
    });
    expect(mejoras.map((c) => [c.area.id, c.antes, c.ahora])).toEqual([
      ['sueno_descanso', 'requiere_atencion', 'adecuado'],
    ]);
    expect(retrocesos.map((c) => c.area.id)).toEqual(['bienestar_emocional']);
    expect(
      cambiosFrenteAnterior({ red_apoyo: 'sin_dato' }, { red_apoyo: 'adecuado' }).retrocesos,
    ).toEqual([]);
  });
});
