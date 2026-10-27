import { useCallback, useEffect, useRef, useState } from 'react';

/** Cierre de sesión por inactividad (D-69): 15 minutos en total, con aviso el último minuto. */
export const LIMITE_INACTIVIDAD_MS = 15 * 60_000;
export const AVISO_INACTIVIDAD_MS = 60_000;

export type FaseInactividad = 'activa' | 'aviso' | 'vencida';

/** Fase según el tiempo sin actividad. Los segundos que quedan solo cuentan durante el aviso. */
export function faseInactividad(
  ahora: number,
  ultimaActividad: number,
  limite = LIMITE_INACTIVIDAD_MS,
  aviso = AVISO_INACTIVIDAD_MS,
): { fase: FaseInactividad; segundos: number } {
  const restante = limite - (ahora - ultimaActividad);
  if (restante <= 0) return { fase: 'vencida', segundos: 0 };
  if (restante <= aviso) return { fase: 'aviso', segundos: Math.ceil(restante / 1000) };
  return { fase: 'activa', segundos: 0 };
}

const EVENTOS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

/**
 * Vigila la actividad en la página. Durante el aviso solo cuenta «Seguir en el panel», para que
 * nadie extienda la sesión sin verla. alVencer se llama una vez.
 */
export function useInactividad(alVencer: () => void) {
  const ultima = useRef(0);
  const fase = useRef<FaseInactividad>('activa');
  const vencida = useRef(false);
  const alVencerRef = useRef(alVencer);
  const [estado, setEstado] = useState<{ fase: FaseInactividad; segundos: number }>({
    fase: 'activa',
    segundos: 0,
  });

  useEffect(() => {
    alVencerRef.current = alVencer;
  }, [alVencer]);

  useEffect(() => {
    ultima.current = Date.now();
    const registrar = () => {
      if (fase.current === 'activa') ultima.current = Date.now();
    };
    for (const e of EVENTOS)
      window.addEventListener(e, registrar, { passive: true, capture: true });
    const reloj = window.setInterval(() => {
      const siguiente = faseInactividad(Date.now(), ultima.current);
      fase.current = siguiente.fase;
      setEstado((previo) =>
        previo.fase === siguiente.fase && previo.segundos === siguiente.segundos
          ? previo
          : siguiente,
      );
      if (siguiente.fase === 'vencida' && !vencida.current) {
        vencida.current = true;
        alVencerRef.current();
      }
    }, 1000);
    return () => {
      for (const e of EVENTOS) window.removeEventListener(e, registrar, { capture: true });
      window.clearInterval(reloj);
    };
  }, []);

  const seguir = useCallback(() => {
    ultima.current = Date.now();
    fase.current = 'activa';
    setEstado({ fase: 'activa', segundos: 0 });
  }, []);

  return { ...estado, seguir };
}
