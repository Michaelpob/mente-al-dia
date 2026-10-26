// GENERADO por scripts/sincronizar-funciones.mjs desde src/lib/motor-resultados/motor.ts. No editar a mano.
/**
 * Motor de resultados de Mente al Día (Fase 2).
 * Módulo TypeScript puro: sin React, sin red y sin dependencias externas, para usarlo igual en el
 * navegador (vista previa, pruebas) y en el servidor (cálculo oficial, Fase 4).
 * Implementa las reglas provisionales del Anexo G; todos los umbrales vienen del objeto de reglas.
 */
import type {
  AreaId,
  ClaveMensaje,
  ConteoNiveles,
  Modulo,
  Nivel,
  Pregunta,
  ReglasResultados,
  Respuesta,
  ResultadoAplicacion,
  ResultadoGeneral,
  ValorRespuesta,
} from './dominio.ts';

export interface InstrumentoMotor {
  modulo: Modulo;
  version: string;
  activo: boolean;
  preguntas: readonly Pregunta[];
  /** Valores admitidos por el módulo (el infantil no admite «prefiero no responder»). */
  valoresPermitidos: readonly ValorRespuesta[];
}

export interface EntradaMotor {
  instrumento: InstrumentoMotor;
  respuestas: readonly Respuesta[];
  reglas: ReglasResultados;
  /** Nombre visible de cada área, para los motivos de prioridad. */
  nombresAreas: Readonly<Record<AreaId, string>>;
}

/** Entrada que el motor rechaza (respuestas incompletas, áreas o valores no permitidos). */
export class ErrorEntradaMotor extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorEntradaMotor';
  }
}

export const MENSAJE_PREFIERO_NO_RESPONDER_NINO =
  'El módulo infantil no admite «prefiero no responder»';

const VALOR_INVERTIDO: Record<ValorRespuesta, ValorRespuesta> = {
  si: 'no',
  no: 'si',
  a_veces: 'a_veces',
  prefiero_no_responder: 'prefiero_no_responder',
};

const NIVEL_POR_VALOR: Record<ValorRespuesta, Nivel> = {
  si: 'adecuado',
  a_veces: 'por_fortalecer',
  no: 'requiere_atencion',
  prefiero_no_responder: 'sin_dato',
};

export const MOTIVO_AREA_SENSIBLE = (nombreArea: string) =>
  `Área sensible en «requiere atención»: ${nombreArea}`;
export const MOTIVO_DESAFIOS = 'Resultado general con desafíos actuales';

function validar({ instrumento, respuestas }: EntradaMotor): Map<AreaId, ValorRespuesta> {
  if (!instrumento.activo) {
    throw new ErrorEntradaMotor(`El módulo «${instrumento.modulo}» no está disponible.`);
  }
  const areasInstrumento = new Set(instrumento.preguntas.map((p) => p.areaId));
  const porArea = new Map<AreaId, ValorRespuesta>();

  for (const { areaId, valor } of respuestas) {
    if (!areasInstrumento.has(areaId)) {
      throw new ErrorEntradaMotor(`El área «${areaId}» no pertenece a este cuestionario.`);
    }
    if (porArea.has(areaId)) {
      throw new ErrorEntradaMotor(`El área «${areaId}» tiene más de una respuesta.`);
    }
    if (!instrumento.valoresPermitidos.includes(valor)) {
      if (instrumento.modulo === 'nino' && valor === 'prefiero_no_responder') {
        throw new ErrorEntradaMotor(MENSAJE_PREFIERO_NO_RESPONDER_NINO);
      }
      throw new ErrorEntradaMotor(`El valor «${valor}» no está permitido en este módulo.`);
    }
    porArea.set(areaId, valor);
  }

  if (porArea.size !== instrumento.preguntas.length) {
    throw new ErrorEntradaMotor(
      `Faltan respuestas: se recibieron ${porArea.size} de ${instrumento.preguntas.length}.`,
    );
  }
  return porArea;
}

function resultadoBase(indice: number, reglas: ReglasResultados): ResultadoGeneral {
  if (indice >= reglas.umbralFavorable) return 'favorable';
  if (indice >= reglas.umbralDesafios) return 'por_fortalecer';
  return 'desafios';
}

export function calcularResultados(entrada: EntradaMotor): ResultadoAplicacion {
  const { instrumento, reglas, nombresAreas } = entrada;
  const porArea = validar(entrada);

  const niveles = {} as Record<AreaId, Nivel>;
  const mensajes = {} as Record<AreaId, ClaveMensaje>;
  const conteo: ConteoNiveles = { adecuado: 0, porFortalecer: 0, requiereAtencion: 0, sinDato: 0 };
  let puntos = 0;
  let respondidas = 0;

  // Las preguntas se recorren en su orden original: así los motivos salen ordenados.
  for (const pregunta of instrumento.preguntas) {
    const original = porArea.get(pregunta.areaId) as ValorRespuesta;
    const valor = pregunta.invertida ? VALOR_INVERTIDO[original] : original;
    const nivel = NIVEL_POR_VALOR[valor];
    niveles[pregunta.areaId] = nivel;
    mensajes[pregunta.areaId] = `${instrumento.modulo}.${pregunta.areaId}.${nivel}`;

    if (valor === 'prefiero_no_responder') {
      conteo.sinDato += 1;
      continue;
    }
    respondidas += 1;
    puntos += reglas.puntos[valor];
    if (nivel === 'adecuado') conteo.adecuado += 1;
    else if (nivel === 'por_fortalecer') conteo.porFortalecer += 1;
    else conteo.requiereAtencion += 1;
  }

  let indice: number | null = null;
  let resultadoGeneral: ResultadoGeneral = 'insuficiente';
  if (respondidas >= reglas.minRespondidas) {
    // Multiplicar antes de dividir evita errores de coma flotante (77,5 → 78).
    indice = Math.round((puntos * 100) / (reglas.puntos.si * respondidas));
    resultadoGeneral = resultadoBase(indice, reglas);
    if (
      resultadoGeneral === 'favorable' &&
      conteo.requiereAtencion >= reglas.ajusteAtencionNoFavorable
    ) {
      resultadoGeneral = 'por_fortalecer';
    }
    if (conteo.requiereAtencion >= reglas.ajusteAtencionDesafios) {
      resultadoGeneral = 'desafios';
    }
  }

  const resultadoParcial =
    respondidas >= reglas.minRespondidas && respondidas < reglas.minRespondidasCompleto;

  const sensibles = new Set(reglas.areasSensibles);
  const motivosPrioridad = instrumento.preguntas
    .filter((p) => sensibles.has(p.areaId) && niveles[p.areaId] === 'requiere_atencion')
    .map((p) => MOTIVO_AREA_SENSIBLE(nombresAreas[p.areaId]));
  const rutaAtencionEspecial = motivosPrioridad.length > 0;
  if (reglas.prioridadPorDesafios && resultadoGeneral === 'desafios') {
    motivosPrioridad.push(MOTIVO_DESAFIOS);
  }

  return {
    niveles,
    mensajes,
    conteo,
    respondidas,
    puntos,
    indice,
    resultadoGeneral,
    resultadoParcial,
    rutaAtencionEspecial,
    prioridad: motivosPrioridad.length > 0,
    motivosPrioridad,
    reglasVersion: reglas.version,
    instrumentoVersion: instrumento.version,
  };
}
