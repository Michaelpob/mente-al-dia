import type { CSSProperties } from 'react';
import type { Nivel } from '@/types/dominio';

/** Una capa de patrón claro sobre el color del nivel, como en la rueda (D-76). */
const capa = (opacidad: number) => `color-mix(in srgb, var(--blanco) ${opacidad}%, transparent)`;

/**
 * Relleno de cada nivel: el color de la rueda del sitio y, salvo en «adecuado», un patrón (rayas,
 * puntos o cuadrícula), para que el nivel no dependa solo del color.
 */
export const rellenoNivel: Record<Nivel, CSSProperties> = {
  adecuado: { background: 'var(--rueda-adecuado)' },
  por_fortalecer: {
    background: `repeating-linear-gradient(45deg, ${capa(45)} 0 3px, transparent 3px 7px), var(--rueda-fortalecer)`,
  },
  requiere_atencion: {
    background: `radial-gradient(circle, ${capa(55)} 1.6px, transparent 1.9px) 0 0 / 7px 7px, var(--rueda-atencion)`,
  },
  sin_dato: {
    background: `repeating-linear-gradient(0deg, ${capa(60)} 0 1.2px, transparent 1.2px 8px), repeating-linear-gradient(90deg, ${capa(60)} 0 1.2px, transparent 1.2px 8px), var(--rueda-sin-dato)`,
  },
};
