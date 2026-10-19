import { describe, expect, it } from 'vitest';
import fuente from '@/content/v1/fuente/mente-al-dia-contenido.json';
import { reglasProvisionales } from '@/content/v1/reglas';
import type { AreaId, Modulo, ReglasResultados, Respuesta, ValorRespuesta } from '@/types/dominio';
import {
  calcularParaModulo,
  calcularResultados,
  ErrorEntradaMotor,
  instrumentoDe,
  MENSAJE_PREFIERO_NO_RESPONDER_NINO,
  MOTIVO_DESAFIOS,
  nombresAreas,
  type InstrumentoMotor,
} from './index';

const preguntasAdulto = instrumentoDe('adulto').preguntas;
const areaDeNumero = (numero: number): AreaId => {
  const pregunta = preguntasAdulto.find((p) => p.numero === numero);
  if (!pregunta) throw new Error(`Sin pregunta ${numero}`);
  return pregunta.areaId;
};

/** Respuestas a partir de un valor por defecto y excepciones por número de pregunta. */
function respuestas(
  porDefecto: ValorRespuesta,
  excepciones: Record<number, ValorRespuesta> = {},
): Respuesta[] {
  return preguntasAdulto.map((p) => ({
    areaId: p.areaId,
    valor: excepciones[p.numero] ?? porDefecto,
  }));
}

const CLAVES_CONFIG: Record<string, keyof ReglasResultados> = {
  umbral_favorable: 'umbralFavorable',
  umbral_desafios: 'umbralDesafios',
  min_respondidas: 'minRespondidas',
  min_respondidas_completo: 'minRespondidasCompleto',
};

function instrumentoCon(modulo: Modulo, invertidas: readonly number[]): InstrumentoMotor {
  const base = instrumentoDe(modulo);
  return {
    ...base,
    preguntas: base.preguntas.map((p) => ({ ...p, invertida: invertidas.includes(p.numero) })),
  };
}

describe('Casos de prueba del Anexo G', () => {
  for (const caso of fuente.casos_prueba) {
    it(`${caso.id}: ${caso.descripcion}`, () => {
      const modulo = caso.modulo as Modulo;
      const esperado = caso.esperado as Record<string, unknown>;

      // T18 no trae respuestas en el JSON: «Sí» en todas y «Prefiero no responder» en la 5.
      const lista: Respuesta[] = caso.respuestas
        ? Object.entries(caso.respuestas as Record<string, string>).map(([numero, valor]) => ({
            areaId: areaDeNumero(Number(numero)),
            valor: valor as ValorRespuesta,
          }))
        : respuestas('si', { 5: 'prefiero_no_responder' });

      const reglas: ReglasResultados = { ...reglasProvisionales };
      for (const [clave, valor] of Object.entries(caso.config as Record<string, number>)) {
        const destino = CLAVES_CONFIG[clave];
        if (!destino) throw new Error(`Configuración desconocida: ${clave}`);
        Object.assign(reglas, { [destino]: valor });
      }

      const calcular = () =>
        calcularResultados({
          instrumento: instrumentoCon(modulo, caso.invertidas),
          respuestas: lista,
          reglas,
          nombresAreas,
        });

      if ('error' in esperado) {
        expect(calcular).toThrow(ErrorEntradaMotor);
        expect(calcular).toThrow(String(esperado.error));
        return;
      }

      const r = calcular();
      expect(r.respondidas).toBe(esperado.respondidas);
      expect(r.puntos).toBe(esperado.puntos);
      expect(r.indice).toBe(esperado.indice);
      expect(r.resultadoGeneral).toBe(esperado.resultado_general);
      expect(r.resultadoParcial).toBe(esperado.resultado_parcial);
      expect(r.rutaAtencionEspecial).toBe(esperado.ruta_atencion_especial);
      expect(r.prioridad).toBe(esperado.prioridad);
      expect(r.motivosPrioridad).toEqual(esperado.motivos_prioridad);
      expect(r.conteo.requiereAtencion).toBe(esperado.n_atencion);
    });
  }
});

describe('Validación de la entrada', () => {
  it('rechaza un módulo desactivado (adolescentes)', () => {
    expect(() => calcularParaModulo('adolescente', [])).toThrow(
      'El módulo «adolescente» no está disponible.',
    );
  });

  it('rechaza un área que no pertenece al cuestionario', () => {
    const lista = respuestas('si');
    lista[0] = { areaId: 'area_inventada' as AreaId, valor: 'si' };
    expect(() => calcularParaModulo('adulto', lista)).toThrow('no pertenece a este cuestionario');
  });

  it('rechaza dos respuestas para la misma área', () => {
    const lista = respuestas('si');
    lista.push({ areaId: 'sueno_descanso', valor: 'no' });
    expect(() => calcularParaModulo('adulto', lista)).toThrow('tiene más de una respuesta');
  });

  it('rechaza un valor no permitido', () => {
    const lista = respuestas('si');
    lista[3] = { areaId: lista[3]!.areaId, valor: 'tal_vez' as ValorRespuesta };
    expect(() => calcularParaModulo('adulto', lista)).toThrow('no está permitido en este módulo');
  });

  it('el módulo infantil no admite «prefiero no responder», con el mensaje del Anexo G', () => {
    expect(() =>
      calcularParaModulo('nino', respuestas('si', { 12: 'prefiero_no_responder' })),
    ).toThrow(MENSAJE_PREFIERO_NO_RESPONDER_NINO);
  });

  it('exige las 20 respuestas («prefiero no responder» cuenta como respondida)', () => {
    expect(() => calcularParaModulo('adulto', respuestas('si').slice(0, 19))).toThrow(
      'Faltan respuestas: se recibieron 19 de 20.',
    );
  });
});

describe('Cálculo', () => {
  it('con cero respuestas válidas no divide por cero: índice nulo e «insuficiente»', () => {
    const r = calcularParaModulo('adulto', respuestas('prefiero_no_responder'));
    expect(r.indice).toBeNull();
    expect(r.resultadoGeneral).toBe('insuficiente');
    expect(r.conteo).toEqual({ adecuado: 0, porFortalecer: 0, requiereAtencion: 0, sinDato: 20 });
  });

  it('umbral exacto de desafíos: 50 es «por fortalecer» y 49 o menos es «desafíos»', () => {
    expect(calcularParaModulo('adulto', respuestas('a_veces')).indice).toBe(50);
    expect(calcularParaModulo('adulto', respuestas('a_veces')).resultadoGeneral).toBe(
      'por_fortalecer',
    );
    // 19 «a veces» y 1 «no»: 19 / 40 = 47,5 → 48.
    const r = calcularParaModulo('adulto', respuestas('a_veces', { 20: 'no' }));
    expect(r.indice).toBe(48);
    expect(r.resultadoGeneral).toBe('desafios');
  });

  it('14 respuestas ya no son resultado parcial; 13 sí', () => {
    const catorce: Record<number, ValorRespuesta> = {};
    for (let n = 15; n <= 20; n += 1) catorce[n] = 'prefiero_no_responder';
    expect(calcularParaModulo('adulto', respuestas('si', catorce)).resultadoParcial).toBe(false);
    expect(
      calcularParaModulo('adulto', respuestas('si', { ...catorce, 14: 'prefiero_no_responder' }))
        .resultadoParcial,
    ).toBe(true);
  });

  it('una pregunta invertida convierte «No» en «Sí»', () => {
    const r = calcularResultados({
      instrumento: instrumentoCon('adulto', [2]),
      respuestas: respuestas('si', { 2: 'no' }),
      reglas: reglasProvisionales,
      nombresAreas,
    });
    expect(r.niveles.sueno_descanso).toBe('adecuado');
    expect(r.indice).toBe(100);
  });

  it('otra configuración de reglas cambia el resultado sin tocar el motor', () => {
    const lista = respuestas('si', { 1: 'no', 2: 'no', 3: 'no', 4: 'no', 5: 'no', 6: 'no' });
    expect(calcularParaModulo('adulto', lista).prioridad).toBe(true);
    const sinPrioridadPorDesafios = { ...reglasProvisionales, prioridadPorDesafios: false };
    const r = calcularParaModulo('adulto', lista, sinPrioridadPorDesafios);
    expect(r.resultadoGeneral).toBe('desafios');
    expect(r.prioridad).toBe(false);
    expect(r.motivosPrioridad).not.toContain(MOTIVO_DESAFIOS);

    const otrasSensibles = {
      ...reglasProvisionales,
      areasSensibles: ['sueno_descanso'] as AreaId[],
    };
    const conSueno = calcularParaModulo('adulto', respuestas('si', { 2: 'no' }), otrasSensibles);
    expect(conSueno.rutaAtencionEspecial).toBe(true);
    expect(conSueno.motivosPrioridad).toEqual([
      'Área sensible en «requiere atención»: Sueño y descanso',
    ]);
  });

  it('devuelve la clave del mensaje de cada área (módulo + área + nivel) y las versiones', () => {
    const r = calcularParaModulo('nino', respuestas('si', { 9: 'a_veces', 10: 'no' }));
    expect(r.mensajes.concentracion).toBe('nino.concentracion.por_fortalecer');
    expect(r.mensajes.afrontamiento_dificultades).toBe(
      'nino.afrontamiento_dificultades.requiere_atencion',
    );
    expect(r.mensajes.bienestar_emocional).toBe('nino.bienestar_emocional.adecuado');
    expect(r.reglasVersion).toBe('0.1-provisional');
    expect(r.instrumentoVersion).toBe('1.0');
    expect(r.conteo).toEqual({ adecuado: 18, porFortalecer: 1, requiereAtencion: 1, sinDato: 0 });
  });
});
