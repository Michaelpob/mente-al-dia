import { describe, expect, it } from 'vitest';
import { estadoInicial, type EstadoParticipacion } from '@/features/participar/estado';
import { preguntasDe } from '@/features/participar/modelo';
import {
  avanceDe,
  estadoParaContinuar,
  estadoParaVerResultado,
  esActividadResultado,
  progresoDe,
} from './progreso';

const CLAVE = '11111111-1111-4111-8111-111111111111';
const total = preguntasDe('adulto').length;

const enCurso = (respondidas: number): EstadoParticipacion => ({
  ...estadoInicial(CLAVE),
  modulo: 'adulto',
  registroCompleto: true,
  fase: 'pregunta',
  indice: respondidas,
  respuestas: Object.fromEntries(
    preguntasDe('adulto')
      .slice(0, respondidas)
      .map((p) => [p.areaId, 'si']),
  ),
});

const enviado = {
  modulo: 'adulto' as const,
  codigo: 'MD-0007',
  fecha: '2026-11-02T15:00:00Z',
  resultado: { resultadoGeneral: 'favorable' } as never,
};

describe('qué se guarda en la cuenta', () => {
  it('nada antes de completar los datos y la autorización', () => {
    expect(progresoDe(estadoInicial(CLAVE))).toBeNull();
    expect(progresoDe({ ...enCurso(3), registroCompleto: false })).toBeNull();
  });

  it('el cuestionario en curso, con su avance', () => {
    const cambio = progresoDe(enCurso(total / 2));
    expect(cambio).toMatchObject({ tipo: 'en_curso', avance: 50 });
  });

  it('cada cuestionario terminado como su propia actividad, sin datos ni respuestas', () => {
    const cambio = progresoDe({ ...estadoInicial(CLAVE), enviado });
    expect(cambio).toEqual({ tipo: 'terminado', actividad: 'resultado:MD-0007', enviado });
    expect(esActividadResultado('resultado:MD-0007')).toBe(true);
    expect(esActividadResultado('cuestionario')).toBe(false);
  });

  it('no guarda un resultado de la vista previa', () => {
    expect(
      progresoDe({ ...estadoInicial(CLAVE), enviado: { ...enviado, ejemplo: true } }),
    ).toBeNull();
  });
});

describe('retomar desde la cuenta', () => {
  it('continúa el cuestionario guardado y cuenta lo respondido', () => {
    const estado = estadoParaContinuar(JSON.parse(JSON.stringify(enCurso(4))));
    expect(estado?.modulo).toBe('adulto');
    expect(estado && avanceDe(estado)).toEqual({ respondidas: 4, total });
  });

  it('descarta lo que no reconoce', () => {
    expect(estadoParaContinuar(null)).toBeNull();
    expect(estadoParaContinuar({ version: 2, claveEnvio: CLAVE, modulo: 'adulto' })).toBeNull();
    expect(estadoParaContinuar({ version: 1, claveEnvio: CLAVE, modulo: 'otro' })).toBeNull();
  });

  it('vuelve a mostrar un resultado terminado en una pestaña nueva', () => {
    const estado = estadoParaVerResultado({ enviado }, CLAVE);
    expect(estado?.enviado?.codigo).toBe('MD-0007');
    expect(estado?.modulo).toBeNull();
    expect(estadoParaVerResultado({ enviado: { codigo: 'x' } }, CLAVE)).toBeNull();
  });
});
