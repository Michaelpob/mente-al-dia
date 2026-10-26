import { createContext, useContext } from 'react';
import type { Accion, EstadoParticipacion } from './estado';

export interface ParticipacionContextValue {
  estado: EstadoParticipacion;
  despachar: (accion: Accion) => void;
  /** Borra todo lo de esta pestaña y empieza un cuestionario nuevo. */
  reiniciar: () => void;
}

export const ParticipacionContext = createContext<ParticipacionContextValue | null>(null);

export function useParticipacion(): ParticipacionContextValue {
  const value = useContext(ParticipacionContext);
  if (!value) throw new Error('useParticipacion debe usarse dentro de <Participacion>.');
  return value;
}
