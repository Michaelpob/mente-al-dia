import { areas } from '@/content/v1/areas';
import { cuestionarios } from '@/content/v1/cuestionarios';
import { reglasProvisionales } from '@/content/v1/reglas';
import type {
  AreaId,
  Modulo,
  ReglasResultados,
  Respuesta,
  ResultadoAplicacion,
} from '@/types/dominio';
import { calcularResultados, type InstrumentoMotor } from './motor';

export * from './motor';

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
