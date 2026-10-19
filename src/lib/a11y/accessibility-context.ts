import { createContext, useContext } from 'react';
import type { AccessibilityPreferences, TogglePreference } from './preferences';

export interface AccessibilityContextValue {
  preferences: AccessibilityPreferences;
  /** Escala actual del texto (1 = 100 %). */
  textScale: number;
  canDecreaseText: boolean;
  canIncreaseText: boolean;
  decreaseText: () => void;
  resetText: () => void;
  increaseText: () => void;
  toggle: (key: TogglePreference) => void;
  resetAll: () => void;
}

export const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function useAccessibility(): AccessibilityContextValue {
  const value = useContext(AccessibilityContext);
  if (!value) throw new Error('useAccessibility debe usarse dentro de <AccessibilityProvider>.');
  return value;
}
