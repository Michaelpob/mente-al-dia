import { Fragment, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { PageLoading, PlaceholderPage } from '@/components/layout/page';
import { useSesion } from './sesion-context';

/**
 * Deja pasar solo a una sesión lista (perfil activo + doble factor); si no, lleva al ingreso. Quien
 * cierra la sesión con el botón vuelve a la página principal (D-74). Si entra otra cuenta, el panel
 * se vuelve a montar desde cero: nada de lo que veía la anterior queda en pantalla (D-86).
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
      return <Fragment key={estado.perfil.id}>{children}</Fragment>;
    default:
      return estado.tipo === 'sin_sesion' && estado.cierre === 'manual' ? (
        <Navigate to="/" replace />
      ) : (
        <Navigate to="/panel/ingresar" replace state={{ desde: pathname + search }} />
      );
  }
}
