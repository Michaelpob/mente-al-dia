import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  [
    // Sin whitespace-nowrap: en pantallas de 320 px una etiqueta larga pasa a dos líneas en vez de desbordar.
    'inline-flex items-center justify-center gap-2 rounded-pill text-center font-cuerpo leading-snug font-semibold no-underline select-none',
    'transition-[background-color,color,border-color,box-shadow,scale] duration-(--duracion-micro) ease-estandar',
    'active:scale-(--escala-presion) disabled:cursor-not-allowed aria-disabled:pointer-events-none',
    '[&_svg]:size-5 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primario:
          'bg-pizarra-700 text-blanco shadow-1 hover:bg-pizarra-800 disabled:bg-piedra-200 disabled:text-grafito-600 disabled:shadow-none aria-disabled:bg-piedra-200 aria-disabled:text-grafito-600',
        secundario:
          'border-2 border-pizarra-700 bg-transparent text-pizarra-700 hover:bg-pizarra-100 hover:text-pizarra-800 disabled:border-borde-campo disabled:text-grafito-600',
        fantasma:
          'text-pizarra-700 hover:bg-pizarra-100 hover:text-pizarra-800 disabled:text-grafito-600',
        apoyo:
          'border border-salvia-600 bg-salvia-100 text-pizarra-800 hover:bg-salvia-600 hover:text-blanco',
        enlace:
          'rounded-sm text-pizarra-700 underline decoration-1 underline-offset-4 hover:text-pizarra-800 hover:decoration-2 active:scale-100',
      },
      size: {
        sm: 'min-h-11 px-4 py-2 text-pequeno',
        md: 'min-h-12 px-6 py-2 text-cuerpo',
        lg: 'min-h-14 px-8 py-2.5 text-cuerpo-grande',
        icono: 'size-11 shrink-0 p-0',
      },
    },
    compoundVariants: [{ variant: 'enlace', className: 'px-1' }],
    defaultVariants: {
      variant: 'primario',
      size: 'md',
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
