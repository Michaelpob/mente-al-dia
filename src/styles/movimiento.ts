/**
 * Tokens de movimiento para Motion (JavaScript).
 * Espejo de las variables --duracion-*, --curva-estandar y --desplazamiento-entrada de tokens.css:
 * si cambias un valor allí, cámbialo también aquí.
 */
export const movimiento = {
  /** segundos */
  duracion: {
    micro: 0.15,
    base: 0.25,
    seccion: 0.45,
    escena: 0.7,
  },
  curva: [0.2, 0.8, 0.2, 1] as const,
  /** píxeles */
  desplazamientoEntrada: 16,
  /** segundos entre elementos de una entrada escalonada */
  escalonado: 0.06,
  /** grados */
  inclinacionMaxima: 6,
} as const;
