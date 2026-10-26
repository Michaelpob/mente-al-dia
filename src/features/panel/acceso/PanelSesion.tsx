import { Outlet } from 'react-router';
import { SesionProvider } from './SesionProvider';

/**
 * Ruta contenedora del panel: da la sesión a todas sus páginas. Se carga aparte para que el
 * cliente de Supabase no pese en el sitio público.
 */
export default function PanelSesion() {
  return (
    <SesionProvider>
      <Outlet />
    </SesionProvider>
  );
}
