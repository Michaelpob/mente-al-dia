import { LazyMotion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { useAccessibility } from '@/lib/a11y/accessibility-context';

const loadMotionFeatures = () => import('./motion-features').then((module) => module.default);

/**
 * Habilita las animaciones de Motion (por ejemplo <Reveal>) dentro de una página.
 * Va en cada página que anima, no en la raíz: así Motion no pesa en la primera carga.
 */
export function MotionScope({ children }: { children: ReactNode }) {
  const { preferences } = useAccessibility();
  return (
    <LazyMotion features={loadMotionFeatures} strict>
      {/* 'user' respeta la preferencia del sistema; 'always', la de la barra de accesibilidad. */}
      <MotionConfig reducedMotion={preferences.reducedMotion ? 'always' : 'user'}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
