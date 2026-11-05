import { useId, useState } from 'react';
import { Card } from '@/components/ui/card';
import { panel } from '@/content/panel';
import { cn } from '@/lib/utils/cn';
import type { AreaId } from '@/types/dominio';
import { CampoSelect } from '../compartido';
import { formatearNumero, formatearPorcentaje } from '../datos/formato';
import {
  fraccion,
  masComunes,
  NIVELES_CENSO,
  ordenarAreas,
  type OrdenAreas,
  type ResumenArea,
} from './analisis';
import { rellenoNivel } from './rellenos';

const c = panel.censo;

export function LeyendaCenso({ className }: { className?: string }) {
  return (
    <ul aria-label={c.areas.leyenda} className={cn('flex flex-wrap gap-x-5 gap-y-2', className)}>
      {NIVELES_CENSO.map((nivel) => (
        <li key={nivel} className="inline-flex items-center gap-2 text-pequeno text-grafito-900">
          <span aria-hidden className="size-4 shrink-0 rounded-sm" style={rellenoNivel[nivel]} />
          {c.niveles[nivel]}
        </li>
      ))}
    </ul>
  );
}

/** Barra al 100 % de un área: cuántas personas quedaron en cada nivel (separadas por 2 px). */
export function BarraNiveles({ resumen }: { resumen: ResumenArea }) {
  return (
    <div
      aria-hidden
      className="flex h-4 w-full gap-[2px] overflow-hidden rounded-pill bg-piedra-100"
    >
      {NIVELES_CENSO.map((nivel) => {
        const n = resumen.conteo[nivel];
        if (!n) return null;
        return (
          <span
            key={nivel}
            title={`${c.niveles[nivel]}: ${c.areas.parteDe(formatearPorcentaje(fraccion(resumen, nivel)), formatearNumero(n))}`}
            className="h-full min-w-[3px]"
            style={{ ...rellenoNivel[nivel], flexGrow: n, flexBasis: 0 }}
          />
        );
      })}
    </div>
  );
}

/** «Fortaleza 40 % (4) · Por fortalecer 30 % (3) · Falencia 30 % (3)», el texto de cada barra. */
function partes(r: ResumenArea): string {
  return NIVELES_CENSO.filter((nivel) => nivel !== 'sin_dato' || r.conteo.sin_dato > 0)
    .map(
      (nivel) =>
        `${c.niveles[nivel]} ${c.areas.parteDe(formatearPorcentaje(fraccion(r, nivel)), formatearNumero(r.conteo[nivel]))}`,
    )
    .join(' · ');
}

function Destacadas({
  titulo,
  lista,
  nivel,
}: {
  titulo: string;
  lista: ResumenArea[];
  nivel: 'adecuado' | 'requiere_atencion';
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-piedra-200 p-4">
      <h3 className="inline-flex items-center gap-2 text-pequeno font-bold text-grafito-900">
        <span aria-hidden className="size-3.5 shrink-0 rounded-sm" style={rellenoNivel[nivel]} />
        {titulo}
      </h3>
      {lista.length === 0 ? (
        <p className="text-pequeno text-grafito-600">{c.areas.ninguna}</p>
      ) : (
        <ol className="flex flex-col gap-1.5 text-pequeno">
          {lista.map((r) => (
            <li key={r.area.id} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-grafito-900">{r.area.nombre}</span>
              <span className="shrink-0 text-grafito-600 tabular-nums">
                <span className="font-semibold text-grafito-900">
                  {formatearPorcentaje(fraccion(r, nivel))}
                </span>{' '}
                ({formatearNumero(r.conteo[nivel])})
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Las 20 áreas con su barra de niveles; elegir un área muestra quiénes la tienen como falencia. */
export function AreasCenso({
  resumen,
  alElegir,
}: {
  resumen: ResumenArea[];
  alElegir: (area: AreaId) => void;
}) {
  const [orden, setOrden] = useState<OrdenAreas>('falencias');
  const idTitulo = useId();
  const lista = ordenarAreas(resumen, orden);

  return (
    <Card role="region" aria-labelledby={idTitulo} className="flex flex-col gap-5 bg-blanco p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={idTitulo} className="text-h3 text-grafito-900">
            {c.areas.titulo}
          </h2>
          <p className="max-w-lectura text-pequeno text-grafito-600">{c.areas.descripcion}</p>
        </div>
        <CampoSelect
          className="w-full sm:w-64"
          etiqueta={c.areas.ordenar}
          valor={orden}
          opciones={(Object.keys(c.areas.ordenes) as OrdenAreas[]).map((o) => ({
            valor: o,
            etiqueta: c.areas.ordenes[o],
          }))}
          alCambiar={(valor) => setOrden(valor as OrdenAreas)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Destacadas
          titulo={c.areas.falenciasComunes}
          lista={masComunes(resumen, 'requiere_atencion')}
          nivel="requiere_atencion"
        />
        <Destacadas
          titulo={c.areas.fortalezasComunes}
          lista={masComunes(resumen, 'adecuado')}
          nivel="adecuado"
        />
      </div>

      <LeyendaCenso />
      <ol className="flex flex-col">
        {lista.map((r) => (
          <li
            key={r.area.id}
            className="grid gap-1.5 border-t border-piedra-200 py-3 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:items-center md:gap-4"
          >
            <button
              type="button"
              onClick={() => alElegir(r.area.id)}
              aria-label={c.areas.verPersonas(r.area.nombre)}
              className="min-h-11 self-start rounded-sm text-left font-semibold text-pizarra-700 underline-offset-4 hover:underline md:self-center"
            >
              {r.area.nombre}
            </button>
            <div className="flex min-w-0 flex-col gap-1.5">
              <BarraNiveles resumen={r} />
              <p className="text-[0.8125rem] text-grafito-600 tabular-nums">
                {r.total ? partes(r) : c.areas.sinDatos}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/** Lista de barras horizontales de un solo color, con el número y la parte del total en texto. */
export function ListaBarras({
  titulo,
  nota,
  filas,
  total,
}: {
  titulo: string;
  nota?: string;
  filas: { etiqueta: string; n: number }[];
  total: number;
}) {
  const idTitulo = useId();
  const maximo = Math.max(1, ...filas.map((f) => f.n));
  const conDatos = filas.some((f) => f.n > 0);
  return (
    <Card role="region" aria-labelledby={idTitulo} className="flex flex-col gap-3 bg-blanco p-5">
      <div className="flex flex-col gap-1">
        <h3 id={idTitulo} className="text-h4 text-grafito-900">
          {titulo}
        </h3>
        {nota ? <p className="text-pequeno text-grafito-600">{nota}</p> : null}
      </div>
      {conDatos ? (
        <ul className="flex flex-col gap-2.5">
          {filas.map((fila) => (
            <li key={fila.etiqueta} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-pequeno">
                <span className="min-w-0 text-grafito-900">{fila.etiqueta}</span>
                <span className="shrink-0 text-grafito-600 tabular-nums">
                  <span className="font-semibold text-grafito-900">{formatearNumero(fila.n)}</span>
                  {total ? ` · ${formatearPorcentaje(fila.n / total)}` : null}
                </span>
              </div>
              <div aria-hidden className="h-2 rounded-pill bg-piedra-100">
                <div
                  className="h-full rounded-pill bg-pizarra-700"
                  style={{ width: `${(fila.n / maximo) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md bg-piedra-50 px-4 py-6 text-center text-pequeno text-grafito-600">
          {c.quienes.sinDatos}
        </p>
      )}
    </Card>
  );
}
