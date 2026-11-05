import { Suspense, useEffect, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { PageLoading } from '@/components/layout/page';
import { PreviewBar } from '@/components/layout/preview-bar';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { MAIN_CONTENT_ID, SkipLink } from '@/components/layout/skip-link';
import { vistaPrevia } from '@/config/entorno';
import { registrarVisita } from '@/features/visitas/registrar-visita';

/** Layout del sitio público: saltar al contenido, encabezado, contenido y pie. */
export function PublicLayout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  // Cuenta la visita para el tablero (D-80): una por sesión del navegador, sin datos de la persona.
  // En desarrollo y en la vista previa no se cuenta.
  useEffect(() => {
    if (import.meta.env.DEV || vistaPrevia) return;
    void registrarVisita({
      url: import.meta.env.VITE_SUPABASE_URL,
      clave: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    });
  }, []);

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

  // Al imprimir (resultados) solo queda el contenido: sin encabezado, pie ni barras.
  return (
    <div className="flex min-h-dvh flex-col print:[&>:not(main)]:hidden">
      <SkipLink />
      <PreviewBar />
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
