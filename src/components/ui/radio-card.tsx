import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Check } from 'lucide-react';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { FieldError } from './field';

interface RadioCardGroupProps extends Omit<
  ComponentProps<typeof RadioGroupPrimitive.Root>,
  'children'
> {
  /** Pregunta o título del grupo (se anuncia como nombre del radiogroup). */
  legend: string;
  hideLegend?: boolean;
  error?: string;
  children: ReactNode;
}

/** Grupo de opciones en forma de tarjeta. Se recorre con las flechas del teclado. */
export function RadioCardGroup({
  legend,
  hideLegend = false,
  error,
  className,
  children,
  ...props
}: RadioCardGroupProps) {
  const id = useId();
  const legendId = `grupo-${id}`;
  const errorId = `grupo-${id}-error`;
  return (
    <div className="flex flex-col gap-3">
      <p id={legendId} className={cn('font-semibold text-grafito-900', hideLegend && 'sr-only')}>
        {legend}
      </p>
      <RadioGroupPrimitive.Root
        aria-labelledby={legendId}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        className={cn('grid gap-3', className)}
        {...props}
      >
        {children}
      </RadioGroupPrimitive.Root>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

interface RadioCardProps extends Omit<
  ComponentProps<typeof RadioGroupPrimitive.Item>,
  'children' | 'title'
> {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Etiqueta corta junto al título, por ejemplo «Próximamente». */
  badge?: string;
}

export function RadioCard({
  title,
  description,
  icon,
  badge,
  className,
  ...props
}: RadioCardProps) {
  const id = useId();
  const titleId = `opcion-${id}`;
  const descriptionId = `opcion-${id}-descripcion`;
  return (
    <RadioGroupPrimitive.Item
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        'group flex min-h-14 w-full min-w-0 items-start gap-3 rounded-lg border-2 border-piedra-200 bg-blanco p-4 text-left sm:gap-4 sm:p-5',
        'transition-[background-color,border-color,box-shadow] duration-(--duracion-base) ease-estandar',
        'hover:border-borde-campo hover:shadow-1',
        'data-[state=checked]:border-pizarra-700 data-[state=checked]:bg-pizarra-100 data-[state=checked]:shadow-1',
        'disabled:cursor-not-allowed disabled:border-dashed disabled:border-piedra-300 disabled:bg-piedra-100 disabled:shadow-none',
        className,
      )}
      {...props}
    >
      {icon ? (
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-md bg-salvia-100 text-salvia-600 group-disabled:bg-piedra-200 group-disabled:text-grafito-600 [&_svg]:size-6"
        >
          {icon}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span
            id={titleId}
            className="font-titulo text-cuerpo-grande font-bold text-pizarra-700 group-disabled:text-grafito-600"
          >
            {title}
          </span>
          {badge ? (
            <span className="rounded-pill border border-borde-campo bg-blanco px-2.5 py-0.5 text-etiqueta text-grafito-900 uppercase">
              {badge}
            </span>
          ) : null}
        </span>
        {description ? (
          <span id={descriptionId} className="text-pequeno text-grafito-600">
            {description}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden
        className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-pill border-2 border-borde-campo bg-blanco text-blanco group-data-[state=checked]:border-pizarra-700 group-data-[state=checked]:bg-pizarra-700"
      >
        <RadioGroupPrimitive.Indicator>
          <Check className="size-4" strokeWidth={3} />
        </RadioGroupPrimitive.Indicator>
      </span>
    </RadioGroupPrimitive.Item>
  );
}
