/**
 * Une el contenido versionado y el motor de resultados del proyecto (mismo código que la
 * plataforma, copiado por scripts/sincronizar-demo.mjs) para usarlos en la demostración.
 */
import { areas } from './proyecto/areas.js';
import { cuestionarios } from './proyecto/cuestionarios.js';
import { calcularResultados } from './proyecto/motor.js';
import { reglasProvisionales } from './proyecto/reglas.js';

export const nombresAreas = Object.fromEntries(areas.map((a) => [a.id, a.nombre]));
export const areaPorId = Object.fromEntries(areas.map((a) => [a.id, a]));

export function instrumentoDe(modulo) {
  const cuestionario = cuestionarios[modulo];
  return {
    modulo,
    version: cuestionario.version,
    activo: cuestionario.activo,
    preguntas: cuestionario.preguntas,
    valoresPermitidos: cuestionario.opciones.map((o) => o.valor),
  };
}

/**
 * @param {'adulto'|'nino'} modulo
 * @param {Record<string, string>} respuestas área → valor
 */
export function calcular(modulo, respuestas) {
  const instrumento = instrumentoDe(modulo);
  return calcularResultados({
    instrumento,
    respuestas: instrumento.preguntas.map((p) => ({ areaId: p.areaId, valor: respuestas[p.areaId] })),
    reglas: reglasProvisionales,
    nombresAreas,
  });
}

/** Clave de sessionStorage donde la demo deja el último cuestionario enviado. */
export const CLAVE_RESULTADO = 'mente-al-dia:demo:resultado';
export const CLAVE_CUESTIONARIO = 'mente-al-dia:demo:cuestionario';
