import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  consultarSede,
  estadoInicialSede,
  guardarSede,
  leerSedeGuardada,
  slugDelEnlace,
  type Sede,
} from './sede';
import { SedeContext, type SedeContextValue } from './sede-context';

function almacenSesion(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

const configuracion = {
  url: import.meta.env.VITE_SUPABASE_URL,
  clave: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
};

/**
 * Lee la institución del enlace (?sede=…) al abrir el sitio, la confirma con la base de datos y la
 * guarda en la pestaña (D-86). Un enlace desconocido o de una institución inactiva no se guarda.
 * Sin enlace, la persona la elige de la lista al empezar el registro (D-88).
 */
export function SedeProvider({ children }: { children: ReactNode }) {
  const [busqueda] = useState(() => window.location.search);
  const [estado, setEstado] = useState(() =>
    estadoInicialSede(busqueda, leerSedeGuardada(almacenSesion())),
  );
  const [intento, setIntento] = useState(0);
  const slug = slugDelEnlace(busqueda);

  useEffect(() => {
    // Solo un enlace con sede se consulta; aunque ya estuviera guardada, por si se desactivó.
    if (!slug) {
      if (estado.tipo === 'invalida') guardarSede(almacenSesion(), null);
      return;
    }
    let vigente = true;
    consultarSede(slug, configuracion)
      .then((sede) => {
        if (!vigente) return;
        guardarSede(almacenSesion(), sede);
        setEstado(sede ? { tipo: 'valida', sede } : { tipo: 'invalida' });
      })
      .catch(() => {
        if (vigente)
          setEstado((previo) => (previo.tipo === 'valida' ? previo : { tipo: 'error', slug }));
      });
    return () => {
      vigente = false;
    };
    // estado.tipo solo importa al empezar; reintentar vuelve a correr la consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);
  const elegir = useCallback((sede: Sede) => {
    guardarSede(almacenSesion(), sede);
    setEstado({ tipo: 'valida', sede });
  }, []);
  const value = useMemo<SedeContextValue>(
    () => ({ estado, reintentar, elegir }),
    [estado, reintentar, elegir],
  );
  return <SedeContext.Provider value={value}>{children}</SedeContext.Provider>;
}
