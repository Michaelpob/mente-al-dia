import { Building2 } from 'lucide-react';
import { Link } from 'react-router';
import { HelplineList } from '@/components/layout/helplines';
import { buttonVariants } from '@/components/ui/button-variants';
import { participar } from '@/content/participar';
import { textos } from '@/content/textos-interfaz';

const t = participar.sinSede;

/**
 * Sin el enlace de una institución no se responde (D-86): el sitio informativo sigue igual, pero el
 * cuestionario pide el enlace que entregó la institución. Las líneas de ayuda siguen a la mano.
 */
export function SinSede({ confirmando = false }: { confirmando?: boolean }) {
  if (confirmando) {
    return (
      <p role="status" className="py-10 text-center text-grafito-600">
        {t.confirmando}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Building2 aria-hidden className="size-10 text-salvia-600" />
        <h1 className="text-h1">{t.titulo}</h1>
        <p className="max-w-lectura text-cuerpo-grande text-grafito-600">{t.texto}</p>
        <Link to="/" className={buttonVariants({ variant: 'secundario', className: 'self-start' })}>
          {t.volver}
        </Link>
      </div>
      <section aria-labelledby="sin-sede-lineas" className="flex flex-col gap-3">
        <h2 id="sin-sede-lineas" className="text-h3">
          {textos.lineasAyuda.titulo}
        </h2>
        <p className="text-grafito-600">{t.lineas}</p>
        <HelplineList className="sm:grid-cols-2" />
      </section>
    </div>
  );
}
