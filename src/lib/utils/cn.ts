import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge necesita conocer los tokens propios: sin esto confunde
 * `text-cuerpo` (tamaño) con `text-pizarra-700` (color) y descarta uno de los dos.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        'piedra-50',
        'piedra-100',
        'piedra-200',
        'piedra-300',
        'blanco',
        'grafito-900',
        'grafito-600',
        'grafito-500',
        'borde-campo',
        'pizarra-800',
        'pizarra-700',
        'pizarra-100',
        'salvia-600',
        'salvia-100',
        'arena-400',
        'arena-100',
        'nivel-adecuado',
        'nivel-adecuado-fondo',
        'nivel-fortalecer',
        'nivel-fortalecer-fondo',
        'nivel-atencion',
        'nivel-atencion-fondo',
        'nivel-sin-dato',
        'nivel-sin-dato-fondo',
        'foco',
        'velo',
      ],
      text: ['display', 'h1', 'h2', 'h3', 'cuerpo-grande', 'cuerpo', 'pequeno', 'etiqueta'],
      font: ['titulo', 'cuerpo', 'sans'],
      radius: ['sm', 'md', 'lg', 'xl', 'pill'],
      shadow: ['1', '2', '3'],
      ease: ['estandar'],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
