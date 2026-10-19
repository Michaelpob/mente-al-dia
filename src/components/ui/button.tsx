import { Slot } from '@radix-ui/react-slot';
import { LoaderCircle } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';
import { buttonVariants, type ButtonVariantProps } from './button-variants';

interface ButtonProps extends ComponentProps<'button'>, ButtonVariantProps {
  /** Renderiza el hijo (por ejemplo un <Link>) con el estilo del botón. */
  asChild?: boolean;
  /** Estado de carga: deshabilita el botón y muestra un indicador. No aplica con asChild. */
  loading?: boolean;
  /** Texto que reemplaza al contenido mientras carga (por ejemplo «Guardando…»). */
  loadingLabel?: string;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  loadingLabel,
  disabled,
  type,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);

  if (asChild) {
    return (
      <Slot className={classes} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      type={type ?? 'button'}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <LoaderCircle aria-hidden className="animate-spin" />
          {loadingLabel ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
