import { createContext, useContext } from 'react';
import type { EstadoSede } from './sede';

export interface SedeContextValue {
  estado: EstadoSede;
  /** Vuelve a consultar la institución del enlace (tras un error de conexión). */
  reintentar: () => void;
}

const SIN_PROVEEDOR: SedeContextValue = {
  estado: { tipo: 'sin_sede' },
  reintentar: () => undefined,
};

export const SedeContext = createContext<SedeContextValue>(SIN_PROVEEDOR);

/** La institución del enlace por el que se entró (D-86). Fuera del sitio público: «sin sede». */
export const useSede = () => useContext(SedeContext);
