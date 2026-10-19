import { CircleAlert } from 'lucide-react';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { fieldControlClasses } from './field-styles';

export interface FieldIds {
  controlId: string;
  labelId: string;
  /** ids de la ayuda y del error, listos para aria-describedby. */
  describedBy: string | undefined;
  invalid: boolean;
}

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  id?: string;
  className?: string;
  children: (ids: FieldIds) => ReactNode;
}

/** Etiqueta + ayuda + control + error, enlazados con aria-describedby. */
export function Field({ label, hint, error, required, id, className, children }: FieldProps) {
  const autoId = useId();
  const controlId = id ?? `campo-${autoId}`;
  const labelId = `${controlId}-etiqueta`;
  const hintId = `${controlId}-ayuda`;
  const errorId = `${controlId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label id={labelId} htmlFor={controlId} className="font-semibold text-grafito-900">
        {label}
        {required ? (
          <span aria-hidden className="text-nivel-atencion">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {hint ? (
        <p id={hintId} className="text-pequeno text-grafito-600">
          {hint}
        </p>
      ) : null}
      {children({ controlId, labelId, describedBy: describedBy || undefined, invalid: !!error })}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-pequeno font-medium text-nivel-atencion">
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

interface TextFieldProps extends Omit<ComponentProps<'input'>, 'id'> {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
}

export function TextField({
  label,
  hint,
  error,
  id,
  required,
  className,
  ...props
}: TextFieldProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required} id={id}>
      {({ controlId, describedBy, invalid }) => (
        <input
          id={controlId}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(fieldControlClasses, className)}
          {...props}
        />
      )}
    </Field>
  );
}
