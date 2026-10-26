import { describe, expect, it } from 'vitest';
import { cuestionarios } from '@/content/v1/cuestionarios';
import { mensajesAdulto, mensajesGenerales, mensajesNinoPorNivel } from '@/content/v1/mensajes';
import { calcularParaModulo } from '@/lib/motor-resultados';
import type { AreaId, Nivel, ValorRespuesta } from '@/types/dominio';
import {
  fechaLarga,
  gruposPorNivel,
  mensajeDeArea,
  mensajeGeneral,
  ORDEN_NIVELES,
  resumenConteo,
} from './presentacion';

const responder = (modulo: 'adulto' | 'nino', valor: (i: number) => ValorRespuesta) =>
  cuestionarios[modulo].preguntas.map((p, i) => ({ areaId: p.areaId, valor: valor(i) }));

/** Adulto con las cuatro situaciones: sí, a veces, no y sin responder. */
const mixto = calcularParaModulo(
  'adulto',
  responder('adulto', (i) => (['si', 'a_veces', 'no', 'prefiero_no_responder'] as const)[i % 4]!),
);

describe('mensajeDeArea', () => {
  it('coincide con la clave de mensaje que calcula el motor para cada área', () => {
    for (const [areaId, clave] of Object.entries(mixto.mensajes)) {
      const [modulo, area, nivel] = clave.split('.') as ['adulto', AreaId, Nivel];
      expect(area).toBe(areaId);
      const esperado =
        nivel === 'sin_dato' ? mensajesGenerales.sinDatoArea : mensajesAdulto[area][nivel];
      expect(mensajeDeArea(modulo, area, nivel)).toBe(esperado);
    }
  });

  it('en el módulo infantil usa el mensaje por nivel', () => {
    expect(mensajeDeArea('nino', 'sueno_descanso', 'por_fortalecer')).toBe(
      mensajesNinoPorNivel.por_fortalecer,
    );
  });
});

describe('gruposPorNivel', () => {
  it('agrupa las 20 áreas, con lo que necesita más cuidado primero y sin grupos vacíos', () => {
    const grupos = gruposPorNivel(mixto.niveles);
    expect(grupos.reduce((n, g) => n + g.areas.length, 0)).toBe(20);
    expect(grupos.map((g) => g.nivel)).toEqual(
      ORDEN_NIVELES.filter((nivel) => Object.values(mixto.niveles).includes(nivel)),
    );
    for (const { nivel, areas } of grupos) {
      for (const area of areas) expect(mixto.niveles[area.id]).toBe(nivel);
      const numeros = areas.map((a) => a.numero);
      expect(numeros).toEqual([...numeros].sort((a, b) => a - b));
    }
  });

  it('un área sin nivel (resultado incompleto) cuenta como «sin dato»', () => {
    const grupos = gruposPorNivel({ bienestar_emocional: 'adecuado' });
    expect(grupos.map((g) => [g.nivel, g.areas.length])).toEqual([
      ['adecuado', 1],
      ['sin_dato', 19],
    ]);
  });
});

describe('textos', () => {
  it('resume el conteo en una frase', () => {
    expect(resumenConteo({ adecuado: 12, porFortalecer: 5, requiereAtencion: 2, sinDato: 1 })).toBe(
      '12 fortalezas, 5 por fortalecer y 2 para cuidar primero. 1 sin dato',
    );
    expect(resumenConteo({ adecuado: 1, porFortalecer: 0, requiereAtencion: 0, sinDato: 0 })).toBe(
      '1 fortaleza',
    );
  });

  it('elige el mensaje general del módulo, o el de respuestas insuficientes', () => {
    expect(mensajeGeneral('nino', 'favorable')).toBe(mensajesGenerales.nino.favorable);
    expect(mensajeGeneral('adulto', 'insuficiente')).toBe(mensajesGenerales.insuficiente);
  });

  it('formatea la fecha en español y tolera que falte', () => {
    expect(fechaLarga('2026-10-27T15:00:00.000Z')).toMatch(/27 de octubre de 2026/);
    expect(fechaLarga(undefined)).toBeNull();
    expect(fechaLarga('no-es-fecha')).toBeNull();
  });
});
