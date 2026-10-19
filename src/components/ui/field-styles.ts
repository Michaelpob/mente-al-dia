/** Estilo compartido por los controles de formulario (input, combobox). */
export const fieldControlClasses = [
  'min-h-12 w-full rounded-md border border-borde-campo bg-blanco px-4 text-cuerpo text-grafito-900',
  'transition-[border-color,box-shadow] duration-(--duracion-micro) ease-estandar',
  'hover:border-grafito-600 focus-visible:border-pizarra-700',
  'aria-invalid:border-2 aria-invalid:border-nivel-atencion',
  'disabled:cursor-not-allowed disabled:border-piedra-300 disabled:bg-piedra-100 disabled:text-grafito-600',
].join(' ');
