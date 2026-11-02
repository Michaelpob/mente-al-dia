import {
  estadoInicial,
  type Enviado,
  type EstadoParticipacion,
} from '@/features/participar/estado';
import { contarRespondidas, esModuloDisponible, preguntasDe } from '@/features/participar/modelo';
import { actividadResultado } from './actividades';

export { ACTIVIDAD_CUESTIONARIO, actividadResultado, esActividadResultado } from './actividades';

/**
 * Qué se guarda en la cuenta y cómo se retoma (D-77). Funciones puras, con pruebas.
 * - «cuestionario»: el cuestionario en curso (uno a la vez), para continuar en otro dispositivo.
 *   Solo se guarda después de completar los datos y dar la autorización.
 * - «resultado:<código>»: cada cuestionario terminado, con su resultado (sin las respuestas).
 * La tabla public.progreso admite otras actividades con el mismo formato.
 */

export type CambioProgreso =
  | { tipo: 'en_curso'; avance: number; estado: EstadoParticipacion }
  | { tipo: 'terminado'; actividad: string; enviado: Enviado };

/** Lo que corresponde guardar según el estado de la pestaña, o null si todavía no hay nada. */
export function progresoDe(estado: EstadoParticipacion): CambioProgreso | null {
  if (estado.enviado && !estado.modulo) {
    // Un resultado calculado sin base de datos (vista previa) no se guarda.
    if (estado.enviado.ejemplo) return null;
    return {
      tipo: 'terminado',
      actividad: actividadResultado(estado.enviado.codigo),
      enviado: estado.enviado,
    };
  }
  if (!estado.modulo || !estado.registroCompleto) return null;
  const total = preguntasDe(estado.modulo).length;
  const respondidas = contarRespondidas(estado.modulo, estado.respuestas);
  return {
    tipo: 'en_curso',
    avance: total ? Math.round((respondidas / total) * 100) : 0,
    estado: { ...estado, enviado: null },
  };
}

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null;

/** El cuestionario guardado, listo para seguir en esta pestaña; null si no se reconoce. */
export function estadoParaContinuar(guardado: unknown): EstadoParticipacion | null {
  if (
    !esObjeto(guardado) ||
    guardado.version !== 1 ||
    typeof guardado.claveEnvio !== 'string' ||
    !esModuloDisponible(guardado.modulo)
  ) {
    return null;
  }
  return { ...estadoInicial(guardado.claveEnvio), ...(guardado as Partial<EstadoParticipacion>) };
}

/** Un cuestionario terminado, para volver a ver su resultado en esta pestaña. */
export function estadoParaVerResultado(
  guardado: unknown,
  claveNueva: string,
): EstadoParticipacion | null {
  const enviado = esObjeto(guardado) ? guardado.enviado : null;
  if (
    !esObjeto(enviado) ||
    typeof enviado.codigo !== 'string' ||
    !esModuloDisponible(enviado.modulo) ||
    !esObjeto(enviado.resultado)
  ) {
    return null;
  }
  return { ...estadoInicial(claveNueva), enviado: enviado as unknown as Enviado };
}

/** Respondidas y total del cuestionario guardado, para mostrar el avance. */
export function avanceDe(estado: EstadoParticipacion): { respondidas: number; total: number } {
  if (!estado.modulo) return { respondidas: 0, total: 0 };
  return {
    respondidas: contarRespondidas(estado.modulo, estado.respuestas),
    total: preguntasDe(estado.modulo).length,
  };
}
