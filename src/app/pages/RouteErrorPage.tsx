import { LifeBuoy, RotateCcw } from 'lucide-react';
import { Link } from 'react-router';
import { PageMeta } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { textos } from '@/content/textos-interfaz';

const t = textos.errorRuta;

/**
 * Se muestra dentro del layout cuando una ruta falla (por ejemplo, si el código de la página
 * no descarga por una conexión inestable). No muestra detalles técnicos.
 */
export function RouteErrorPage() {
  return (
    <>
      <PageMeta title={t.titulo} indexable={false} />
      <section className="contenedor seccion">
        <div className="max-w-lectura">
          <h1 className="text-h1">{t.titulo}</h1>
          <p className="mt-4 text-cuerpo-grande text-grafito-600">{t.texto}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => window.location.reload()}>
              <RotateCcw aria-hidden />
              {t.reintentar}
            </Button>
            <Button asChild variant="secundario">
              <Link to="/lineas-de-ayuda">
                <LifeBuoy aria-hidden />
                {textos.noEncontrada.verLineas}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
