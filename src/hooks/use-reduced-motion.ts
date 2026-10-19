import { useSyncExternalStore } from 'react';
import { useAccessibility } from '@/lib/a11y/accessibility-context';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/** true si el sistema pide reducir el movimiento. */
export function useSystemReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** true si el sistema o la barra de accesibilidad piden reducir el movimiento. */
export function useReducedMotion(): boolean {
  const system = useSystemReducedMotion();
  const { preferences } = useAccessibility();
  return system || preferences.reducedMotion;
}
