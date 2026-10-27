import { CircleAlert, CircleCheck, CircleDot, CircleMinus, type LucideIcon } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/feedback';
import { fieldControlClasses } from '@/components/ui/field-styles';
import { panel } from '@/content/panel';
import { cn } from '@/lib/utils/cn';
import { esFaltaDePermiso } from './datos/consultas';
import type { ResultadoGeneral } from './datos/tipos';

/** Piezas comunes de las páginas del panel. */

export function EncabezadoPanel({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-h2 text-balance text-pizarra-700">{titulo}</h1>
        {descripcion ? <p className="max-w-lectura text-grafito-600">{descripcion}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-3">{children}</div> : null}
    </div>
  );
}

/** Contenedor de cada página del panel: ancho cómodo para tablas, con margen lateral. */
export function PaginaPanel({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}

const estilosResultado: Record<ResultadoGeneral, { Icon: LucideIcon; className: string }> = {
  favorable: { Icon: CircleCheck, className: 'bg-nivel-adecuado-fondo text-nivel-adecuado' },
  por_fortalecer: { Icon: CircleDot, className: 'bg-nivel-fortalecer-fondo text-nivel-fortalecer' },
  desafios: { Icon: CircleAlert, className: 'bg-nivel-atencion-fondo text-nivel-atencion' },
  insuficiente: { Icon: CircleMinus, className: 'bg-nivel-sin-dato-fondo text-nivel-sin-dato' },
};

/** Resultado general con ícono, texto y color (los mismos colores de los niveles del sitio). */
export function ResultadoBadge({
  resultado,
  className,
}: {
  resultado: ResultadoGeneral;
  className?: string;
}) {
  const { Icon, className: colores } = estilosResultado[resultado];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-pequeno font-semibold whitespace-nowrap contraste-alto:border contraste-alto:border-current',
        colores,
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" strokeWidth={2.25} />
      {panel.resultados[resultado]}
    </span>
  );
}

export function ErrorCarga({ error, alReintentar }: { error: unknown; alReintentar: () => void }) {
  return (
    <Callout variant="apoyo" className="flex flex-col items-start gap-3">
      <span>{esFaltaDePermiso(error) ? panel.errores.sinPermiso : panel.errores.cargar}</span>
      <Button variant="secundario" size="sm" onClick={alReintentar}>
        {panel.errores.reintentar}
      </Button>
    </Callout>
  );
}

interface Opcion {
  valor: string;
  etiqueta: string;
}

/** Lista desplegable nativa con etiqueta visible (accesible y cómoda en el teléfono). */
export function CampoSelect({
  etiqueta,
  valor,
  opciones,
  alCambiar,
  className,
}: {
  etiqueta: string;
  valor: string;
  opciones: readonly Opcion[];
  alCambiar: (valor: string) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-pequeno font-semibold text-grafito-900">
        {etiqueta}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        className={cn(fieldControlClasses, 'pr-8')}
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CampoFecha({
  etiqueta,
  valor,
  alCambiar,
  min,
  max,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  min?: string;
  max?: string;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-pequeno font-semibold text-grafito-900">
        {etiqueta}
      </label>
      <input
        id={id}
        type="date"
        value={valor}
        min={min}
        max={max}
        onChange={(e) => alCambiar(e.target.value)}
        className={fieldControlClasses}
      />
    </div>
  );
}
