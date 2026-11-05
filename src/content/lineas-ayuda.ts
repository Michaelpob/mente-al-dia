/**
 * Líneas de ayuda (D-85): las que entregó el equipo del proyecto, en su mismo orden. Son las únicas
 * que se muestran en el sitio (encabezado, página de líneas y resultados).
 */
export type EstadoLinea = 'verificada' | 'completar' | 'opcional';

export interface LineaAyuda {
  id: string;
  /** Solo dígitos, para el enlace tel:. En pantalla se muestra con numeroVisible(). */
  numero: string;
  nombre: string;
  atiende: string;
  /** Solo si se conoce: no se inventa un horario. */
  horario?: string;
  cobertura: string;
  estado: EstadoLinea;
  /** Solo las líneas activas se muestran en el sitio. */
  activa: boolean;
}

export const lineasAyudaMeta = {
  version: '2.0',
  fuente: 'equipo del proyecto',
  nota: 'Líneas entregadas por el equipo del proyecto el 5 de noviembre de 2026 (D-85).',
} as const;

export const lineasAyuda: readonly LineaAyuda[] = [
  {
    id: 'salud-mental-106',
    numero: '106',
    nombre: 'Línea Nacional de Salud Mental',
    atiende: 'Escucha y orientación en salud mental',
    cobertura: 'Nacional',
    estado: 'verificada',
    activa: true,
  },
  {
    id: 'tolima-linea-naranja',
    numero: '3186072341',
    nombre: 'Tolima – Línea Naranja «Yo te escucho»',
    atiende: 'Escucha y apoyo emocional',
    cobertura: 'Tolima',
    estado: 'verificada',
    activa: true,
  },
  {
    id: 'tolima-hablalo',
    numero: '3173188854',
    nombre: 'Tolima – «Háblalo», línea diseñada para hombres',
    atiende: 'Escucha y apoyo emocional para hombres',
    cobertura: 'Tolima',
    estado: 'verificada',
    activa: true,
  },
  {
    id: 'emergencias',
    numero: '123',
    nombre: 'Emergencias',
    atiende: 'Cualquier situación de peligro inmediato',
    horario: '24 horas',
    cobertura: 'Nacional',
    estado: 'verificada',
    activa: true,
  },
];

export const lineasActivas: readonly LineaAyuda[] = lineasAyuda.filter((linea) => linea.activa);

/** La línea de emergencias (123): va primero en el apoyo inmediato de los resultados. */
export const lineaEmergencias: LineaAyuda | undefined = lineasActivas.find(
  (linea) => linea.id === 'emergencias',
);

/** Solo los números reales se pueden marcar con un enlace tel:. */
export function esMarcable(numero: string): boolean {
  return /^\d{3,10}$/.test(numero);
}

/** Un celular de 10 dígitos se lee mejor en grupos: «318 607 2341». Los cortos quedan igual. */
export function numeroVisible(numero: string): string {
  return /^\d{10}$/.test(numero)
    ? `${numero.slice(0, 3)} ${numero.slice(3, 6)} ${numero.slice(6)}`
    : numero;
}
