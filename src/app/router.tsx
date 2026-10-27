import { lazy } from 'react';
import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router';
import { guiaEstiloHabilitada, vistaPrevia } from '@/config/entorno';
import { PanelLayout } from './layouts/PanelLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { RouteErrorPage } from './pages/RouteErrorPage';
import { redirigirEnlaceDeAcceso } from '@/features/panel/acceso/enlaces';
import { RequierePanel } from '@/features/panel/acceso/RequierePanel';

// Carga diferida por ruta: cada página es un archivo JS aparte.
const InicioPage = lazy(() => import('@/features/inicio/InicioPage'));
const Participacion = lazy(() => import('@/features/participar/Participacion'));
const RegistroPage = lazy(() => import('@/features/registro/RegistroPage'));
const IngresarPage = lazy(() => import('@/features/registro/IngresarPage'));
const CuestionarioPage = lazy(() => import('@/features/cuestionario/CuestionarioPage'));
const ResultadosPage = lazy(() => import('@/features/resultados/ResultadosPage'));
const LineasAyudaPage = lazy(() => import('@/features/lineas-ayuda/LineasAyudaPage'));
const PrivacidadPage = lazy(() => import('@/features/informacion/PrivacidadPage'));
const TerminosPage = lazy(() => import('@/features/informacion/TerminosPage'));
const AccesibilidadPage = lazy(() => import('@/features/informacion/AccesibilidadPage'));
const MapaSitioPage = lazy(() => import('@/features/informacion/MapaSitioPage'));
const PanelPage = lazy(() => import('@/features/panel/PanelPage'));
const PanelSesion = lazy(() => import('@/features/panel/acceso/PanelSesion'));
const IngresoPanelPage = lazy(() => import('@/features/panel/acceso/IngresoPanelPage'));
const DefinirContrasenaPage = lazy(() => import('@/features/panel/acceso/DefinirContrasenaPage'));
const GuiaEstiloPage = lazy(() => import('@/features/guia-estilo/GuiaEstiloPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const publicRoutes: RouteObject[] = [
  { index: true, element: <InicioPage /> },
  {
    // Registro, cuestionario y resultados comparten el estado de esta pestaña.
    element: <Participacion />,
    children: [
      { path: 'registro', element: <RegistroPage /> },
      { path: 'cuestionario', element: <CuestionarioPage /> },
      { path: 'resultados', element: <ResultadosPage /> },
    ],
  },
  { path: 'ingresar', element: <IngresarPage /> },
  { path: 'lineas-de-ayuda', element: <LineasAyudaPage /> },
  { path: 'privacidad', element: <PrivacidadPage /> },
  { path: 'terminos', element: <TerminosPage /> },
  { path: 'accesibilidad', element: <AccesibilidadPage /> },
  { path: 'mapa-del-sitio', element: <MapaSitioPage /> },
  ...(guiaEstiloHabilitada ? [{ path: 'guia-de-estilo', element: <GuiaEstiloPage /> }] : []),
  { path: '*', element: <NotFoundPage /> },
];

const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [{ errorElement: <RouteErrorPage />, children: publicRoutes }],
  },
  {
    path: 'panel',
    element: <PanelLayout />,
    children: [
      {
        errorElement: <RouteErrorPage />,
        // La sesión (Supabase) solo se carga en el panel.
        element: <PanelSesion />,
        children: [
          {
            index: true,
            element: (
              <RequierePanel>
                <PanelPage />
              </RequierePanel>
            ),
          },
          { path: 'ingresar', element: <IngresoPanelPage /> },
          { path: 'definir-contrasena', element: <DefinirContrasenaPage /> },
        ],
      },
    ],
  },
];

function crearRouterNavegador() {
  // Un enlace de invitación o de recuperación que llegó a otra página pasa a definir la contraseña
  // antes de que el enrutador lea la dirección (D-67).
  const { pathname, hash } = window.location;
  const destino = redirigirEnlaceDeAcceso(pathname, hash, import.meta.env.BASE_URL);
  if (destino) window.history.replaceState(null, '', destino);
  // Con `vite build --base /carpeta/` el sitio vive en una subcarpeta (GitHub Pages).
  return createBrowserRouter(routes, {
    basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
  });
}

// En la vista previa (Artifact de claude.ai) la dirección no se puede cambiar: se navega en memoria.
export const router = vistaPrevia
  ? createMemoryRouter(routes, { initialEntries: ['/guia-de-estilo'] })
  : crearRouterNavegador();
