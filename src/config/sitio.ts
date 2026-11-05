/**
 * Datos que todavía faltan se muestran con marcadores entre corchetes (por ejemplo, el horario
 * de una línea de ayuda): nunca se inventan nombres, cifras ni teléfonos.
 */

/** true si el valor sigue siendo un marcador pendiente, como «[COMPLETAR]». */
export function esMarcador(valor: string): boolean {
  return /^\[.*\]$/.test(valor.trim());
}
