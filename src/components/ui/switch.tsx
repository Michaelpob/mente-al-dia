import { useId } from 'react';
import { cn } from '@/lib/utils/cn';

interface SwitchFieldProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/** Interruptor sí/no con etiqueta y descripción enlazadas. */
export function SwitchField({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: SwitchFieldProps) {
  const id = useId();
  const labelId = `interruptor-${id}`;
  const descriptionId = `interruptor-${id}-descripcion`;
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex flex-col gap-0.5">
        <span id={labelId} className="font-semibold text-grafito-900">
          {label}
        </span>
        {description ? (
          <span id={descriptionId} className="text-pequeno text-grafito-600">
            {description}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'group relative inline-flex h-8 w-14 shrink-0 items-center rounded-pill border-2 p-0.5',
          'transition-[background-color,border-color] duration-(--duracion-base) ease-estandar',
          'border-borde-campo bg-piedra-200 aria-checked:border-pizarra-700 aria-checked:bg-pizarra-700 contraste-alto:bg-blanco',
          'disabled:cursor-not-allowed disabled:opacity-70',
        )}
      >
        <span
          aria-hidden
          className="size-6 rounded-pill bg-blanco shadow-1 transition-[translate] duration-(--duracion-base) ease-estandar group-aria-checked:translate-x-6 contraste-alto:bg-grafito-900 contraste-alto:group-aria-checked:bg-blanco"
        />
      </button>
    </div>
  );
}
