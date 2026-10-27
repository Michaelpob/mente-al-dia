import { Link } from 'react-router';
import { PageMeta } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { Callout, Eyebrow } from '@/components/ui/feedback';
import { panel } from '@/content/panel';
import { textos, type PaginaId } from '@/content/textos-interfaz';
import { PaginaPanel } from '../compartido';

/** Secciones del menú que llegan en la Fase 9: se ven en el menú y explican qué tendrán. */
export function EnConstruccion({ pagina }: { pagina: PaginaId }) {
  const info = textos.paginas[pagina];
  return (
    <PaginaPanel>
      <PageMeta title={info.titulo} indexable={false} />
      <div className="flex max-w-lectura flex-col gap-4">
        <Eyebrow>{panel.enConstruccion.etiqueta}</Eyebrow>
        <h1 className="text-h2 text-pizarra-700">{info.titulo}</h1>
        <p className="text-cuerpo-grande text-grafito-600">{info.descripcion}</p>
        <Callout>{panel.enConstruccion.texto(info.fase)}</Callout>
        <Button asChild variant="secundario" className="self-start">
          <Link to="/panel">{panel.enConstruccion.volver}</Link>
        </Button>
      </div>
    </PaginaPanel>
  );
}
