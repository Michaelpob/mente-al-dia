import { HeartHandshake, Info } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/** Bloque de carga. Es decorativo: el estado se anuncia en el contenedor con aria-busy. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden
      className={cn(
        'rounded-md bg-piedra-200 movimiento:animate-pulso-suave contraste-alto:bg-piedra-100',
        className,
      )}
      {...props}
    />
  );
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-dashed border-piedra-300 bg-blanco px-6 py-10 text-center',
        className,
      )}
    >
      <span
        aria-hidden
        className="flex size-14 items-center justify-center rounded-pill bg-piedra-100 text-grafito-600 [&_svg]:size-7"
      >
        {icon}
      </span>
      <h3 className="text-h3">{title}</h3>
      {description ? <p className="max-w-md text-grafito-600">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

interface CalloutProps {
  variant?: 'informativo' | 'apoyo';
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Callout informativo (pizarra) o de apoyo (arena con borde terracota tenue).
 * El de apoyo nunca usa rojos intensos ni íconos de alarma.
 */
export function Callout({
  variant = 'informativo',
  title,
  icon,
  children,
  className,
}: CalloutProps) {
  const apoyo = variant === 'apoyo';
  return (
    <div
      className={cn(
        'flex gap-4 rounded-lg border p-5',
        apoyo
          ? 'border-nivel-atencion/25 bg-arena-100 contraste-alto:border-nivel-atencion'
          : 'border-pizarra-700/15 bg-pizarra-100 contraste-alto:border-pizarra-700',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-0.5 shrink-0 [&_svg]:size-6',
          apoyo ? 'text-nivel-atencion' : 'text-pizarra-700',
        )}
      >
        {icon ?? (apoyo ? <HeartHandshake /> : <Info />)}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        {title ? <p className="font-semibold text-grafito-900">{title}</p> : null}
        <div className="text-grafito-900">{children}</div>
      </div>
    </div>
  );
}

/** Etiqueta pequeña en mayúsculas sobre un título. */
export function Eyebrow({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-etiqueta text-salvia-600 uppercase', className)} {...props} />;
}
