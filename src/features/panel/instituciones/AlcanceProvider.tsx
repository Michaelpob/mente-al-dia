import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { esGeneral } from '../acceso/estado-sesion';
import { useSesion } from '../acceso/sesion-context';
import { AlcanceContext, guardarAlcance, leerAlcanceGuardado, type AlcancePanel } from './alcance';

function almacenSesion(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Da a todo el panel la institución que se está viendo (D-86). */
export function AlcanceProvider({ children }: { children: ReactNode }) {
  const { estado } = useSesion();
  const perfil = estado.tipo === 'lista' ? estado.perfil : null;
  const general = esGeneral(perfil);
  const [guardada, setGuardada] = useState(() => leerAlcanceGuardado(almacenSesion()));

  const elegir = useCallback((id: string | null) => {
    guardarAlcance(almacenSesion(), id);
    setGuardada(id);
  }, []);

  const value = useMemo<AlcancePanel>(
    () => ({
      general,
      propia: general ? null : (perfil?.institucion ?? null),
      // Solo el general elige; al institucional la base lo deja siempre en la suya.
      elegida: general ? guardada : null,
      elegir,
    }),
    [general, perfil?.institucion, guardada, elegir],
  );

  return <AlcanceContext.Provider value={value}>{children}</AlcanceContext.Provider>;
}
