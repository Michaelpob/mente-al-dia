import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { PageLoading, PlaceholderPage } from '@/components/layout/page';
import { useSesion } from './sesion-context';

/** Deja pasar solo a una sesión lista (perfil activo + doble factor); si no, lleva al ingreso. */
export function RequierePanel({ children }: { children: ReactNode }) {
  const { estado } = useSesion();
  const { pathname } = useLocation();

  switch (estado.tipo) {
    case 'sin_configurar':
      return <PlaceholderPage pagina="panel" />;
    case 'cargando':
      return <PageLoading />;
    case 'lista':
      return children;
    default:
      return <Navigate to="/panel/ingresar" replace state={{ desde: pathname }} />;
  }
}
