import { Building2, Check, Copy, Link2 } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { fieldControlClasses } from '@/components/ui/field-styles';
import { panelInstituciones } from '@/content/panel-instituciones';
import { cn } from '@/lib/utils/cn';
import { CampoSelect } from '../compartido';
import { enlaceDeSede, useAlcance, useInstituciones } from './alcance';

const a = panelInstituciones.alcance;
const e = panelInstituciones.enlace;

/**
 * Junto al título de cada sección: el general elige qué institución ver (o todas); el
 * administrador institucional ve el nombre de la suya, que es lo único que el panel le muestra.
 */
export function SelectorInstitucion() {
  const { general, propia, elegida, elegir } = useAlcance();
  const instituciones = useInstituciones(general);

  // Una institución guardada que ya no está en la lista vuelve a «todas».
  useEffect(() => {
    if (elegida && instituciones.data && !instituciones.data.some((i) => i.id === elegida)) {
      elegir(null);
    }
  }, [elegida, instituciones.data, elegir]);

  if (!general) {
    return propia ? (
      <p className="inline-flex items-center gap-2 rounded-pill border border-piedra-200 bg-blanco px-3 py-1.5 text-pequeno font-semibold text-grafito-900">
        <Building2 aria-hidden className="size-4 text-salvia-600" />
        <span className="sr-only">{a.etiqueta}: </span>
        {propia.nombre}
      </p>
    ) : null;
  }

  return (
    <CampoSelect
      className="w-full min-w-56 sm:w-64"
      etiqueta={a.etiqueta}
      valor={elegida ?? ''}
      opciones={[
        { valor: '', etiqueta: a.todas },
        ...(instituciones.data ?? []).map((i) => ({
          valor: i.id,
          etiqueta: i.activa ? i.nombre : a.inactiva(i.nombre),
        })),
      ]}
      alCambiar={(valor) => elegir(valor || null)}
    />
  );
}

/** El enlace público de una institución en un campo de solo lectura, con botón para copiarlo. */
export function CampoEnlace({ nombre, slug }: { nombre: string; slug: string }) {
  const id = useId();
  const enlace = enlaceDeSede(slug);
  const [estado, setEstado] = useState<'listo' | 'copiado' | 'error'>('listo');

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      setEstado('copiado');
    } catch {
      setEstado('error');
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="sr-only">
          {e.etiqueta(nombre)}
        </label>
        <input
          id={id}
          readOnly
          value={enlace}
          onFocus={(ev) => ev.currentTarget.select()}
          className={cn(fieldControlClasses, 'font-mono min-w-0 flex-1 basis-56 text-pequeno')}
        />
        <Button variant="secundario" size="sm" onClick={() => void copiar()}>
          {estado === 'copiado' ? (
            <Check aria-hidden className="size-4" />
          ) : (
            <Copy aria-hidden className="size-4" />
          )}
          {e.copiar}
        </Button>
      </div>
      <p role="status" className="text-pequeno text-grafito-600 empty:hidden">
        {estado === 'copiado' ? e.copiado : estado === 'error' ? e.noCopiado : ''}
      </p>
    </div>
  );
}

/** Tarjeta del enlace de una institución: para qué sirve y el enlace para copiar. */
export function TarjetaEnlace({
  nombre,
  slug,
  activa,
  className,
}: {
  nombre: string;
  slug: string;
  activa: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-piedra-200 bg-blanco p-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Link2 aria-hidden className="mt-0.5 size-5 shrink-0 text-salvia-600" />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={id} className="text-h4 text-grafito-900">
            {e.titulo} · {nombre}
          </h2>
          <p className="text-pequeno text-grafito-600">{activa ? e.texto : e.inactiva}</p>
        </div>
      </div>
      <CampoEnlace nombre={nombre} slug={slug} />
    </section>
  );
}

/**
 * En el tablero: la tarjeta del enlace de la institución que se está viendo (la propia del
 * administrador institucional, o la que eligió el general). Con «todas», nada.
 */
export function EnlaceDeLaInstitucion() {
  const { general, propia, elegida } = useAlcance();
  const instituciones = useInstituciones(general && elegida !== null);
  const vista = general ? instituciones.data?.find((i) => i.id === elegida) : propia;
  if (!vista) return null;
  return <TarjetaEnlace nombre={vista.nombre} slug={vista.slug} activa={vista.activa} />;
}
