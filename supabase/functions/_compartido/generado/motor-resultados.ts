// GENERADO por scripts/sincronizar-funciones.mjs desde src/lib/motor-resultados/index.ts. No editar a mano.
import { areas } from './areas.ts';
import { cuestionarios } from './cuestionarios.ts';
import { reglasProvisionales } from './reglas.ts';
import type {
  AreaId,
  Modulo,
  ReglasResultados,
  Respuesta,
  ResultadoAplicacion,
} from './dominio.ts';
import { calcularResultados, type InstrumentoMotor } from './motor.ts';

export * from './motor.ts';

export const nombresAreas = Object.fromEntries(areas.map((a) => [a.id, a.nombre])) as Record<
  AreaId,
  string
>;

/** Instrumento listo para el motor a partir del cuestionario versionado de un módulo. */
export function instrumentoDe(modulo: Modulo): InstrumentoMotor {
  const cuestionario = cuestionarios[modulo];
  return {
    modulo,
    version: cuestionario.version,
    activo: cuestionario.activo,
    preguntas: cuestionario.preguntas,
    valoresPermitidos: cuestionario.opciones.map((o) => o.valor),
  };
}

/** Atajo: calcula con el contenido v1 y las reglas vigentes (o las que se indiquen). */
export function calcularParaModulo(
  modulo: Modulo,
  respuestas: readonly Respuesta[],
  reglas: ReglasResultados = reglasProvisionales,
): ResultadoAplicacion {
  return calcularResultados({
    instrumento: instrumentoDe(modulo),
    respuestas,
    reglas,
    nombresAreas,
  });
}
