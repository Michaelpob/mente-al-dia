import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Callout, Eyebrow, Skeleton } from '@/components/ui/feedback';
import { textos, type PaginaId } from '@/content/textos-interfaz';

interface PageMetaProps {
  title: string;
  /** false = noindex (registro, cuestionario, resultados, panel). */
  indexable?: boolean;
}

/** Título único por página y, si corresponde, noindex. React 19 los lleva al <head>. */
export function PageMeta({ title, indexable = true }: PageMetaProps) {
  return (
    <>
      <title>{textos.sitio.tituloPagina(title)}</title>
      {indexable ? null : <meta name="robots" content="noindex" />}
    </>
  );
}

/** Página provisional para las rutas que se construyen en fases posteriores. */
export function PlaceholderPage({ pagina }: { pagina: PaginaId }) {
  const info = textos.paginas[pagina];
  return (
    <>
      <PageMeta title={info.titulo} indexable={info.indexable} />
      <section className="contenedor seccion">
        <div className="max-w-lectura">
          <Eyebrow>{textos.comunes.enConstruccion}</Eyebrow>
          <h1 className="mt-3 text-h1">{info.titulo}</h1>
          <p className="mt-4 text-cuerpo-grande text-grafito-600">{info.descripcion}</p>
          <Callout className="mt-8">{textos.comunes.seConstruyeEnFase(info.fase)}</Callout>
          {pagina === 'inicio' ? null : (
            <Button asChild variant="secundario" className="mt-8">
              <Link to="/">{textos.comunes.volverInicio}</Link>
            </Button>
          )}
        </div>
      </section>
    </>
  );
}

/** Estado de carga mientras llega el código de una ruta. */
export function PageLoading() {
  return (
    <div aria-busy="true" className="contenedor seccion">
      <p role="status" className="sr-only">
        {textos.comunes.cargando}
      </p>
      <div className="flex max-w-lectura flex-col gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-5/6" />
      </div>
    </div>
  );
}
