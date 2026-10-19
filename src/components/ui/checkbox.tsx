import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { FieldError } from './field';

interface CheckboxFieldProps {
  label: ReactNode;
  description?: string;
  error?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Casilla accesible. Nunca debe venir marcada por defecto en las autorizaciones. */
export function CheckboxField({
  label,
  description,
  error,
  checked,
  onCheckedChange,
  id,
  name,
  required,
  disabled,
  className,
}: CheckboxFieldProps) {
  const autoId = useId();
  const controlId = id ?? `casilla-${autoId}`;
  const descriptionId = `${controlId}-descripcion`;
  const errorId = `${controlId}-error`;
  const describedBy =
    [description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-start gap-3">
        <CheckboxPrimitive.Root
          id={controlId}
          name={name}
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-sm border-2 border-borde-campo bg-blanco text-blanco',
            'transition-[background-color,border-color] duration-(--duracion-micro) ease-estandar',
            'hover:border-grafito-600 data-[state=checked]:border-pizarra-700 data-[state=checked]:bg-pizarra-700',
            'disabled:cursor-not-allowed disabled:bg-piedra-100 aria-invalid:border-nivel-atencion',
          )}
        >
          <CheckboxPrimitive.Indicator>
            <Check aria-hidden className="size-4" strokeWidth={3} />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
        <div className="flex flex-col gap-0.5">
          <label htmlFor={controlId} className="cursor-pointer text-grafito-900">
            {label}
            {required ? (
              <span aria-hidden className="text-nivel-atencion">
                {' '}
                *
              </span>
            ) : null}
          </label>
          {description ? (
            <p id={descriptionId} className="text-pequeno text-grafito-600">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}
