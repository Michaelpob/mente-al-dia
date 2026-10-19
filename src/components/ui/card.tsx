import { cva, type VariantProps } from 'class-variance-authority';
import { useRef, type ComponentProps, type PointerEvent } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils/cn';
import { movimiento } from '@/styles/movimiento';

const cardVariants = cva('rounded-lg bg-blanco text-grafito-900', {
  variants: {
    variant: {
      base: 'border border-piedra-200',
      elevada: 'border border-transparent shadow-2 contraste-alto:border-piedra-200',
      interactiva: [
        'border border-piedra-200 shadow-1',
        'transition-[box-shadow,translate,border-color] duration-(--duracion-base) ease-estandar',
        'focus-within:shadow-3 hover:border-piedra-300 hover:shadow-3 movimiento:hover:-translate-y-0.5',
      ],
    },
  },
  defaultVariants: { variant: 'base' },
});

type CardProps = ComponentProps<'div'> & VariantProps<typeof cardVariants>;

export function Card({ className, variant, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant }), className)} {...props} />;
}

/**
 * Tarjeta con inclinación 3D por CSS (sin WebGL): perspectiva de 900 px y máximo 6°,
 * siguiendo el puntero. Solo se activa con puntero fino y sin «reducir movimiento».
 */
export function TiltCard({ className, onPointerMove, onPointerLeave, ...props }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');
  const enabled = finePointer && !reducedMotion;

  function setTilt(rx: number, ry: number) {
    ref.current?.style.setProperty('--inclinacion-x', `${rx.toFixed(2)}deg`);
    ref.current?.style.setProperty('--inclinacion-y', `${ry.toFixed(2)}deg`);
  }

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(event);
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    const max = movimiento.inclinacionMaxima;
    setTilt(-y * 2 * max, x * 2 * max);
  }

  function handleLeave(event: PointerEvent<HTMLDivElement>) {
    onPointerLeave?.(event);
    setTilt(0, 0);
  }

  return (
    <Card
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={cn(
        enabled &&
          'transform-[perspective(var(--perspectiva-tarjeta))_rotateX(var(--inclinacion-x,0deg))_rotateY(var(--inclinacion-y,0deg))] transition-transform duration-(--duracion-base) ease-estandar',
        className,
      )}
      {...props}
    />
  );
}
