import { Suspense, useEffect, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { GovCoTopBar } from '@/components/layout/govco';
import { PageLoading } from '@/components/layout/page';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { MAIN_CONTENT_ID, SkipLink } from '@/components/layout/skip-link';

/** Layout del sitio público: saltar al contenido, encabezado, contenido y pie. */
export function PublicLayout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  // Al cambiar de página, el foco va al contenido para que el lector de pantalla lo anuncie.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  // Anclas (/#areas): desplaza a la sección cuando exista en la página.
  useEffect(() => {
    if (!location.hash) return;
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    target?.scrollIntoView({ block: 'start' });
  }, [location.pathname, location.hash]);

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <GovCoTopBar />
      <SiteHeader />
      <main id={MAIN_CONTENT_ID} ref={mainRef} tabIndex={-1} className="flex-1 outline-none">
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
      <ScrollRestoration />
    </div>
  );
}
