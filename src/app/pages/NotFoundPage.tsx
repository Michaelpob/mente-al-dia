import { Compass, LifeBuoy } from 'lucide-react';
import { Link } from 'react-router';
import { PageMeta } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { textos } from '@/content/textos-interfaz';

const t = textos.noEncontrada;

/** Página 404 amable, con salida al inicio y a las líneas de ayuda. */
export default function NotFoundPage() {
  return (
    <>
      <PageMeta title={t.titulo} indexable={false} />
      <section className="contenedor seccion">
        <div className="mx-auto flex max-w-lectura flex-col items-center gap-5 text-center">
          <span
            aria-hidden
            className="flex size-16 items-center justify-center rounded-pill bg-salvia-100 text-salvia-600"
          >
            <Compass className="size-8" />
          </span>
          <h1 className="text-h1">{t.titulo}</h1>
          <p className="text-cuerpo-grande text-grafito-600">{t.texto}</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/">{t.irInicio}</Link>
            </Button>
            <Button asChild variant="secundario">
              <Link to="/lineas-de-ayuda">
                <LifeBuoy aria-hidden />
                {t.verLineas}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
