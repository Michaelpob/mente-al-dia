/**
 * Respiración guiada: inhala 4 s, sostén 2 s y exhala 6 s, cinco veces (cerca de un minuto).
 * La usan la página de inicio y, más adelante, la pantalla de resultados.
 */
export interface FaseRespiracion {
  nombre: string;
  segundos: number;
  /** Escala del círculo al terminar la fase (1 = tamaño en reposo). */
  escala: number;
}

export const FASES_RESPIRACION: readonly FaseRespiracion[] = [
  { nombre: 'Inhala', segundos: 4, escala: 1.6 },
  { nombre: 'Sostén', segundos: 2, escala: 1.6 },
  { nombre: 'Exhala', segundos: 6, escala: 1 },
];

export const CICLOS_RESPIRACION = 5;

/** La fase en la posición indicada (0 = inhala, 1 = sostén, 2 = exhala). */
export function faseRespiracion(indice: number): FaseRespiracion {
  const fase = FASES_RESPIRACION[indice];
  if (!fase) throw new Error(`No existe la fase de respiración ${indice}`);
  return fase;
}
