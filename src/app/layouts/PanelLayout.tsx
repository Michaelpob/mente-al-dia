import { ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';
import { Link, Outlet, ScrollRestoration } from 'react-router';
import { MenteAlDiaLogo } from '@/components/brand/logos';
import { PageLoading } from '@/components/layout/page';
import { PreviewBar } from '@/components/layout/preview-bar';
import { MAIN_CONTENT_ID, SkipLink } from '@/components/layout/skip-link';
import { Button } from '@/components/ui/button';
import { textos } from '@/content/textos-interfaz';

/** Base del panel de administración: sobria, sin 3D ni animaciones decorativas (D-17). */
export function PanelLayout() {
  return (
    <div className="min-h-dvh bg-piedra-50">
      <SkipLink />
      <PreviewBar />
      <Suspense fallback={<PageLoading />}>
        <Outlet />
      </Suspense>
      <ScrollRestoration />
    </div>
  );
}

/**
 * Ingreso y definición de contraseña: encabezado simple, sin el menú del panel. El logo y «Volver al
 * inicio» llevan a la página principal (D-74).
 */
export function AccesoLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-piedra-200 bg-blanco">
        <div className="contenedor flex min-h-16 items-center gap-4">
          <Link
            to="/"
            aria-label={textos.encabezado.irAlInicio}
            className="rounded-sm no-underline"
          >
            <MenteAlDiaLogo wordmarkClassName="hidden xs:inline texto-grande:hidden sm:texto-grande:inline" />
          </Link>
          {/* Con el texto agrandado, el nombre del panel solo cabe junto a «Volver al inicio» en pantallas anchas. */}
          <span
            aria-hidden
            className="hidden h-6 w-px bg-piedra-200 sm:block texto-grande:hidden lg:texto-grande:block"
          />
          <span className="hidden font-semibold text-grafito-600 sm:inline texto-grande:hidden lg:texto-grande:inline">
            {textos.paginas.panel.titulo}
          </span>
          <Button asChild variant="fantasma" size="sm" className="ml-auto">
            <Link to="/">
              <ArrowLeft aria-hidden />
              {textos.accesoPanel.volverInicio}
            </Link>
          </Button>
        </div>
      </header>
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 outline-none">
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
