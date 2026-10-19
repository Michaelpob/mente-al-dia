import { lazy } from 'react';
import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router';
import { guiaEstiloHabilitada, vistaPrevia } from '@/config/entorno';
import { PanelLayout } from './layouts/PanelLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { RouteErrorPage } from './pages/RouteErrorPage';

// Carga diferida por ruta: cada página es un archivo JS aparte.
const InicioPage = lazy(() => import('@/features/inicio/InicioPage'));
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
const GuiaEstiloPage = lazy(() => import('@/features/guia-estilo/GuiaEstiloPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const publicRoutes: RouteObject[] = [
  { index: true, element: <InicioPage /> },
  { path: 'registro', element: <RegistroPage /> },
  { path: 'ingresar', element: <IngresarPage /> },
  { path: 'cuestionario', element: <CuestionarioPage /> },
  { path: 'resultados', element: <ResultadosPage /> },
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
      { errorElement: <RouteErrorPage />, children: [{ index: true, element: <PanelPage /> }] },
    ],
  },
];

// En la vista previa (Artifact de claude.ai) la dirección no se puede cambiar: se navega en memoria.
export const router = vistaPrevia
  ? createMemoryRouter(routes, { initialEntries: ['/guia-de-estilo'] })
  : createBrowserRouter(routes);
