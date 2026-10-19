import { Suspense } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { MenteAlDiaLogo } from '@/components/brand/logos';
import { PageLoading } from '@/components/layout/page';
import { MAIN_CONTENT_ID, SkipLink } from '@/components/layout/skip-link';
import { textos } from '@/content/textos-interfaz';

/** Layout sobrio del panel profesional: sin 3D ni animaciones decorativas. Se completa en la Fase 8. */
export function PanelLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-piedra-50">
      <SkipLink />
      <header className="border-b border-piedra-200 bg-blanco">
        <div className="contenedor flex min-h-16 items-center gap-4">
          <MenteAlDiaLogo />
          <span aria-hidden className="h-6 w-px bg-piedra-200" />
          <span className="font-semibold text-grafito-600">{textos.paginas.panel.titulo}</span>
        </div>
      </header>
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 outline-none">
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>
      <ScrollRestoration />
    </div>
  );
}
