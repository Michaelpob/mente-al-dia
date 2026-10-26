import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { Outlet } from 'react-router';
import { guardarEstado, leerEstado, nuevaClaveEnvio, reducir } from './estado';
import { ParticipacionContext, type ParticipacionContextValue } from './participacion-context';

function almacenSesion(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Ruta contenedora del registro, el cuestionario y los resultados: comparten el mismo estado,
 * guardado en sessionStorage (se borra al cerrar la pestaña).
 */
export default function Participacion() {
  const [estado, despachar] = useReducer(reducir, null, () =>
    leerEstado(almacenSesion(), nuevaClaveEnvio),
  );

  useEffect(() => guardarEstado(almacenSesion(), estado), [estado]);

  const reiniciar = useCallback(
    () => despachar({ tipo: 'reiniciar', claveEnvio: nuevaClaveEnvio() }),
    [],
  );

  const value = useMemo<ParticipacionContextValue>(
    () => ({ estado, despachar, reiniciar }),
    [estado, reiniciar],
  );

  return (
    <ParticipacionContext.Provider value={value}>
      <Outlet />
    </ParticipacionContext.Provider>
  );
}
