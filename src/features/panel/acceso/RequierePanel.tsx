import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { PageLoading, PlaceholderPage } from '@/components/layout/page';
import { useSesion } from './sesion-context';

/**
 * Deja pasar solo a una sesión lista (perfil activo + doble factor); si no, lleva al ingreso. Quien
 * cierra la sesión con el botón vuelve a la página principal (D-74).
 */
export function RequierePanel({ children }: { children: ReactNode }) {
  const { estado } = useSesion();
  const { pathname, search } = useLocation();

  switch (estado.tipo) {
    case 'sin_configurar':
      return <PlaceholderPage pagina="panel" />;
    case 'cargando':
      return <PageLoading />;
    case 'lista':
      return children;
    default:
      return estado.tipo === 'sin_sesion' && estado.cierre === 'manual' ? (
        <Navigate to="/" replace />
      ) : (
        <Navigate to="/panel/ingresar" replace state={{ desde: pathname + search }} />
      );
  }
}
