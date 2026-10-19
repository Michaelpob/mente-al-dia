import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityContext, type AccessibilityContextValue } from './accessibility-context';
import {
  applyPreferences,
  DEFAULT_PREFERENCES,
  DEFAULT_TEXT_SCALE_STEP,
  loadPreferences,
  savePreferences,
  TEXT_SCALE_STEPS,
  textScaleFor,
  type AccessibilityPreferences,
  type TogglePreference,
} from './preferences';

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(loadPreferences);

  useEffect(() => {
    applyPreferences(preferences);
    savePreferences(preferences);
  }, [preferences]);

  const changeStep = useCallback((delta: number | 'reset') => {
    setPreferences((current) => ({
      ...current,
      textScaleStep:
        delta === 'reset'
          ? DEFAULT_TEXT_SCALE_STEP
          : Math.min(Math.max(current.textScaleStep + delta, 0), TEXT_SCALE_STEPS.length - 1),
    }));
  }, []);

  const toggle = useCallback((key: TogglePreference) => {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      preferences,
      textScale: textScaleFor(preferences.textScaleStep),
      canDecreaseText: preferences.textScaleStep > 0,
      canIncreaseText: preferences.textScaleStep < TEXT_SCALE_STEPS.length - 1,
      decreaseText: () => changeStep(-1),
      resetText: () => changeStep('reset'),
      increaseText: () => changeStep(1),
      toggle,
      resetAll: () => setPreferences(DEFAULT_PREFERENCES),
    }),
    [preferences, changeStep, toggle],
  );

  return <AccessibilityContext value={value}>{children}</AccessibilityContext>;
}
