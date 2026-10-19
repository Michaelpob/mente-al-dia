import { LifeBuoy, Phone } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { Callout } from '@/components/ui/feedback';
import { esMarcador } from '@/config/sitio';
import { esMarcable, lineasActivas, type LineaAyuda } from '@/content/lineas-ayuda';
import { textos } from '@/content/textos-interfaz';
import { cn } from '@/lib/utils/cn';

function HelplineItem({ linea }: { linea: LineaAyuda }) {
  const marcable = esMarcable(linea.numero);
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-piedra-200 bg-blanco p-4">
      <p
        className={cn(
          'font-titulo font-extrabold text-pizarra-700 tabular-nums',
          esMarcador(linea.numero) ? 'text-cuerpo-grande' : 'text-h2',
        )}
      >
        {linea.numero}
      </p>
      <p className="font-semibold text-grafito-900">{linea.nombre}</p>
      <dl className="grid gap-0.5 text-pequeno text-grafito-600">
        <div>
          <dt className="inline font-semibold">{textos.lineasAyuda.atiende}: </dt>
          <dd className="inline">{linea.atiende}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">{textos.lineasAyuda.horario}: </dt>
          <dd className="inline">{linea.horario}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">{textos.lineasAyuda.cobertura}: </dt>
          <dd className="inline">{linea.cobertura}</dd>
        </div>
      </dl>
      {marcable ? (
        <Button asChild size="sm" className="mt-1 self-start">
          <a
            href={`tel:${linea.numero}`}
            aria-label={textos.lineasAyuda.llamarA(linea.numero, linea.nombre)}
          >
            <Phone aria-hidden />
            {textos.lineasAyuda.llamar}
          </a>
        </Button>
      ) : null}
    </li>
  );
}

export function HelplineList({ className }: { className?: string }) {
  return (
    <ul className={cn('grid gap-3', className)}>
      {lineasActivas.map((linea) => (
        <HelplineItem key={linea.id} linea={linea} />
      ))}
    </ul>
  );
}

/** Botón destacado del encabezado: abre el panel lateral con las líneas de ayuda. */
export function HelplinesButton() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          variant="apoyo"
          size="sm"
          aria-label={textos.encabezado.lineasAyuda}
          className="px-3 sm:px-4"
        >
          <LifeBuoy aria-hidden />
          {/* «Ayuda» en pantallas pequeñas (y hasta 768 px con el texto agrandado). */}
          <span className="sm:hidden sm:texto-grande:inline md:texto-grande:hidden">
            {textos.encabezado.lineasAyudaCorto}
          </span>
          <span className="hidden sm:inline sm:texto-grande:hidden md:texto-grande:inline">
            {textos.encabezado.lineasAyuda}
          </span>
        </Button>
      </DrawerTrigger>
      <DrawerContent title={textos.lineasAyuda.titulo} description={textos.lineasAyuda.descripcion}>
        <Callout variant="apoyo" className="mb-4">
          {textos.lineasAyuda.emergencia}
        </Callout>
        <HelplineList />
        <DrawerClose asChild>
          <Button asChild variant="enlace" className="mt-4">
            <Link to="/lineas-de-ayuda">{textos.lineasAyuda.verTodas}</Link>
          </Button>
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  );
}
