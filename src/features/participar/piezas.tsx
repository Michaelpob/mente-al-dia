import type { ComponentProps, ReactNode } from 'react';
import { Field } from '@/components/ui/field';
import { fieldControlClasses } from '@/components/ui/field-styles';
import { Stepper } from '@/components/ui/stepper';
import { participar } from '@/content/participar';
import { cn } from '@/lib/utils/cn';

/** Avance del registro y el cuestionario: Quién responde · Tus datos · Autorización · Preguntas · Revisión. */
export function PasosParticipacion({ actual }: { actual: number }) {
  return (
    <Stepper
      steps={participar.pasos}
      current={actual}
      label={participar.pasosEtiqueta}
      className="mb-10"
    />
  );
}

/** Contenedor de cada pantalla del flujo: ancho de lectura y espacio de sección. */
export function PantallaParticipacion({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('contenedor seccion', className)}>
      <div className="mx-auto max-w-lectura">{children}</div>
    </section>
  );
}

interface SelectFieldProps extends Omit<ComponentProps<'select'>, 'id'> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/** Lista desplegable nativa con etiqueta, ayuda y error (como TextField). */
export function SelectField({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
  ...props
}: SelectFieldProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required} id={id}>
      {({ controlId, describedBy, invalid }) => (
        <select
          id={controlId}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(fieldControlClasses, 'appearance-auto pr-3', className)}
          {...props}
        >
          {children}
        </select>
      )}
    </Field>
  );
}
