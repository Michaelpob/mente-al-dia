import { m } from 'motion/react';
import type { ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { movimiento } from '@/styles/movimiento';

interface RevealProps {
  children: ReactNode;
  /** Posición dentro de una entrada escalonada (0, 1, 2…): retrasa 60 ms por paso. */
  index?: number;
  className?: string;
}

/**
 * Entrada de sección: fundido + 16 px hacia arriba, una sola vez al entrar en pantalla.
 * Con «reducir movimiento» queda solo un fundido corto. Debe ir dentro de <MotionScope>.
 */
export function Reveal({ children, index = 0, className }: RevealProps) {
  const reducedMotion = useReducedMotion();
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: reducedMotion ? 0 : movimiento.desplazamientoEntrada }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{
        duration: reducedMotion ? movimiento.duracion.micro : movimiento.duracion.seccion,
        ease: movimiento.curva,
        delay: reducedMotion ? 0 : index * movimiento.escalonado,
      }}
    >
      {children}
    </m.div>
  );
}
