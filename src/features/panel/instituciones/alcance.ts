import { useQuery } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import type { InstitucionPerfil } from '../acceso/estado-sesion';
import { obtenerInstituciones } from '../datos/consultas';

/**
 * Qué institución se está viendo en el panel (D-86). El administrador general elige una o todas;
 * el administrador institucional siempre ve la suya, y eso lo garantiza la base de datos, no esta
 * elección: el panel ni siquiera le manda una institución.
 */
export interface AlcancePanel {
  /** Administrador general: ve todas las instituciones y puede elegir una. */
  general: boolean;
  /** La institución del administrador institucional. */
  propia: InstitucionPerfil | null;
  /** La que eligió el general (id); null es «todas». Para el institucional, siempre null. */
  elegida: string | null;
  elegir: (id: string | null) => void;
}

export const AlcanceContext = createContext<AlcancePanel>({
  general: false,
  propia: null,
  elegida: null,
  elegir: () => undefined,
});

export const useAlcance = () => useContext(AlcanceContext);

export const CLAVE_ALCANCE = 'mad.panel.institucion';
const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** La institución elegida en esta pestaña, si tiene forma de id. */
export function leerAlcanceGuardado(almacen: Pick<Storage, 'getItem'> | null): string | null {
  try {
    const valor = almacen?.getItem(CLAVE_ALCANCE) ?? null;
    return valor && PATRON_UUID.test(valor) ? valor : null;
  } catch {
    return null;
  }
}

export function guardarAlcance(
  almacen: Pick<Storage, 'setItem' | 'removeItem'> | null,
  id: string | null,
): void {
  try {
    if (id && PATRON_UUID.test(id)) almacen?.setItem(CLAVE_ALCANCE, id);
    else almacen?.removeItem(CLAVE_ALCANCE);
  } catch {
    // Sin almacenamiento, la elección dura mientras la página siga abierta.
  }
}

/** El enlace público con el que responden las personas de una institución. */
export function enlaceDeSede(
  slug: string,
  origen: string = window.location.origin,
  base: string = import.meta.env.BASE_URL,
): string {
  const raiz = `${origen.replace(/\/$/, '')}/${base.replace(/^\/|\/$/g, '')}`.replace(/\/$/, '');
  return `${raiz}/?${new URLSearchParams({ sede: slug })}`;
}

/** Las instituciones con su actividad de todo el historial (una sola consulta para todo el panel). */
export function useInstituciones(habilitada = true) {
  return useQuery({
    queryKey: ['panel', 'instituciones', null, null],
    queryFn: () => obtenerInstituciones(null, null),
    staleTime: 5 * 60_000,
    enabled: habilitada,
  });
}
