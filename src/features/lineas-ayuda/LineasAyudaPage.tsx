import { HelplineList } from '@/components/layout/helplines';
import { PageMeta } from '@/components/layout/page';
import { Eyebrow } from '@/components/ui/feedback';
import { textos } from '@/content/textos-interfaz';

/** Líneas de ayuda (datos de la configuración, Anexo F). La Fase 3 completa las rutas locales. */
export default function LineasAyudaPage() {
  return (
    <>
      <PageMeta title={textos.lineasAyuda.titulo} />
      <section className="contenedor seccion">
        <div className="max-w-lectura">
          <Eyebrow>{textos.sitio.alcaldia}</Eyebrow>
          <h1 className="mt-3 text-h1">{textos.lineasAyuda.titulo}</h1>
          <p className="mt-4 text-cuerpo-grande text-grafito-600">
            {textos.lineasAyuda.paginaIntro}
          </p>
        </div>
        <HelplineList className="mt-10 sm:grid-cols-2 lg:grid-cols-3" />
      </section>
    </>
  );
}
