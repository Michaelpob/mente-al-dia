import * as Popover from '@radix-ui/react-popover';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Flag,
  FilterX,
  Inbox,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { PageMeta } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { fieldControlClasses } from '@/components/ui/field-styles';
import { panel } from '@/content/panel';
import { areas } from '@/content/v1/areas';
import { cn } from '@/lib/utils/cn';
import type { AreaId, Nivel } from '@/types/dominio';
import {
  CampoFecha,
  CampoSelect,
  EncabezadoPanel,
  ErrorCarga,
  PaginaPanel,
  ResultadoBadge,
} from '../compartido';
import { obtenerOpcionesLugar, obtenerRegistros } from '../datos/consultas';
import {
  REGISTROS_POR_DEFECTO,
  TAMANOS,
  escribirFiltrosRegistros,
  hayFiltros,
  hoyEnColombia,
  leerFiltrosRegistros,
} from '../datos/filtros';
import { formatearFecha, formatearNumero } from '../datos/formato';
import type {
  EstadoSeguimiento,
  FilaRegistro,
  FiltrosRegistros,
  OrdenRegistros,
  ResultadoGeneral,
} from '../datos/tipos';

const t = panel.registros;
const f = panel.filtros;

type Columna = keyof typeof t.columnas;
const OPCIONALES: readonly Columna[] = [
  'modulo',
  'lugar',
  'resultado',
  'atencion',
  'prioridad',
  'estado',
  'asignado',
  'correo',
  'telefono',
];
const ORDENABLES: Partial<Record<Columna, OrdenRegistros>> = {
  fecha: 'fecha',
  nombre: 'nombre',
  modulo: 'modulo',
  lugar: 'lugar',
  resultado: 'resultado',
  atencion: 'atencion',
  prioridad: 'prioridad',
  estado: 'estado',
};
const CLAVE_COLUMNAS = 'mad.panel.columnasOcultas';
/** Al elegir solo un nivel, se filtra desde la primera área (la base pide área y nivel juntos). */
const AREA_INICIAL: AreaId = 'bienestar_emocional';

function leerOcultas(): Set<Columna> {
  try {
    const guardadas = JSON.parse(window.localStorage.getItem(CLAVE_COLUMNAS) ?? '[]') as unknown;
    return new Set(
      Array.isArray(guardadas)
        ? guardadas.filter((c): c is Columna => OPCIONALES.includes(c as Columna))
        : [],
    );
  } catch {
    return new Set();
  }
}

/** /panel/registros: tabla con búsqueda, filtros, orden y paginación en el servidor (filtros en la dirección). */
export default function RegistrosPage() {
  const [params, setParams] = useSearchParams();
  const { search } = useLocation();
  const filtros = leerFiltrosRegistros(params);
  const hoy = useMemo(() => hoyEnColombia(), []);
  const [verFiltros, setVerFiltros] = useState(() => hayFiltros(filtros));
  const [ocultas, setOcultas] = useState(leerOcultas);

  const consulta = useQuery({
    queryKey: ['panel', 'registros', filtros],
    queryFn: () => obtenerRegistros(filtros),
    placeholderData: keepPreviousData,
  });
  const lugares = useQuery({
    queryKey: ['panel', 'lugares'],
    queryFn: () => obtenerOpcionesLugar(hoy),
    staleTime: 5 * 60_000,
  });

  const cambiar = (nuevos: Partial<FiltrosRegistros>) =>
    setParams(escribirFiltrosRegistros({ ...filtros, pagina: 1, ...nuevos }));

  const buscar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    cambiar({ q: String(new FormData(e.currentTarget).get('q') ?? '') });
  };

  const alternarColumna = (c: Columna) =>
    setOcultas((previas) => {
      const siguientes = new Set(previas);
      if (siguientes.has(c)) siguientes.delete(c);
      else siguientes.add(c);
      try {
        window.localStorage.setItem(CLAVE_COLUMNAS, JSON.stringify([...siguientes]));
      } catch {
        // Sin almacenamiento, la elección dura solo esta visita.
      }
      return siguientes;
    });

  const visibles = (['fecha', 'nombre', ...OPCIONALES] as Columna[]).filter((c) => !ocultas.has(c));
  const ordenar = (orden: OrdenRegistros) =>
    cambiar({
      orden,
      descendente: filtros.orden === orden ? !filtros.descendente : orden === 'fecha',
    });

  const datos = consulta.data;
  const paginas = datos ? Math.max(1, Math.ceil(datos.total / filtros.tamano)) : 1;
  const desde = datos && datos.total ? (filtros.pagina - 1) * filtros.tamano + 1 : 0;
  const hasta = datos ? Math.min(datos.total, filtros.pagina * filtros.tamano) : 0;

  const opcionesLugar = [
    { valor: '', etiqueta: f.todos },
    ...[...new Set([...(filtros.lugar ? [filtros.lugar] : []), ...(lugares.data ?? [])])].map(
      (l) => ({ valor: l, etiqueta: l }),
    ),
  ];

  return (
    <PaginaPanel>
      <PageMeta title={t.titulo} indexable={false} />
      <EncabezadoPanel
        titulo={t.titulo}
        descripcion={datos ? t.total(formatearNumero(datos.total)) : t.descripcion}
      />

      <div className="flex flex-col gap-4 rounded-xl border border-piedra-200 bg-blanco p-4">
        <div className="flex flex-wrap items-end gap-3">
          <form
            key={filtros.q}
            role="search"
            onSubmit={buscar}
            className="flex min-w-0 flex-1 basis-72 gap-2"
          >
            <label htmlFor="busqueda-registros" className="sr-only">
              {panel.busqueda.etiqueta}
            </label>
            <input
              id="busqueda-registros"
              name="q"
              type="search"
              defaultValue={filtros.q}
              placeholder={panel.busqueda.placeholder}
              className={fieldControlClasses}
            />
            <Button type="submit" variant="secundario">
              <Search aria-hidden className="size-4" />
              {panel.busqueda.boton}
            </Button>
          </form>
          <Button
            variant="secundario"
            aria-expanded={verFiltros}
            aria-controls="filtros-registros"
            onClick={() => setVerFiltros((v) => !v)}
          >
            <SlidersHorizontal aria-hidden className="size-4" />
            {f.titulo}
          </Button>
          <SelectorColumnas ocultas={ocultas} alAlternar={alternarColumna} />
          {hayFiltros(filtros) || filtros.q ? (
            <Button
              variant="enlace"
              onClick={() => setParams(escribirFiltrosRegistros(REGISTROS_POR_DEFECTO))}
            >
              <FilterX aria-hidden className="size-4" />
              {f.limpiar}
            </Button>
          ) : null}
        </div>

        <div
          id="filtros-registros"
          hidden={!verFiltros}
          className="grid gap-4 border-t border-piedra-200 pt-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <CampoFecha
            etiqueta={f.desde}
            valor={filtros.desde ?? ''}
            max={filtros.hasta ?? hoy}
            alCambiar={(v) => cambiar({ desde: v || null })}
          />
          <CampoFecha
            etiqueta={f.hasta}
            valor={filtros.hasta ?? ''}
            min={filtros.desde ?? undefined}
            max={hoy}
            alCambiar={(v) => cambiar({ hasta: v || null })}
          />
          <CampoSelect
            etiqueta={f.modulo}
            valor={filtros.modulo ?? ''}
            opciones={[
              { valor: '', etiqueta: f.todos },
              { valor: 'adulto', etiqueta: panel.modulos.adulto },
              { valor: 'nino', etiqueta: panel.modulos.nino },
            ]}
            alCambiar={(v) => cambiar({ modulo: v === 'adulto' || v === 'nino' ? v : null })}
          />
          <CampoSelect
            etiqueta={f.lugar}
            valor={filtros.lugar ?? ''}
            opciones={opcionesLugar}
            alCambiar={(v) => cambiar({ lugar: v || null })}
          />
          <CampoSelect
            etiqueta={f.resultado}
            valor={filtros.resultado ?? ''}
            opciones={[
              { valor: '', etiqueta: f.todos },
              ...Object.entries(panel.resultados).map(([valor, etiqueta]) => ({ valor, etiqueta })),
            ]}
            alCambiar={(v) => cambiar({ resultado: (v || null) as ResultadoGeneral | null })}
          />
          <CampoSelect
            etiqueta={f.area}
            valor={filtros.area ?? ''}
            opciones={[
              { valor: '', etiqueta: f.todas },
              ...[...areas]
                .sort((a, b) => a.numero - b.numero)
                .map((a) => ({ valor: a.id, etiqueta: a.nombre })),
            ]}
            alCambiar={(v) =>
              cambiar({
                area: (v || null) as AreaId | null,
                nivel: v ? (filtros.nivel ?? 'requiere_atencion') : null,
              })
            }
          />
          <CampoSelect
            etiqueta={f.nivel}
            valor={filtros.nivel ?? ''}
            opciones={[
              { valor: '', etiqueta: f.todos },
              ...Object.entries(panel.niveles).map(([valor, etiqueta]) => ({ valor, etiqueta })),
            ]}
            alCambiar={(v) =>
              cambiar({
                nivel: (v || null) as Nivel | null,
                area: v ? (filtros.area ?? AREA_INICIAL) : null,
              })
            }
          />
          <CampoSelect
            etiqueta={f.prioridad}
            valor={filtros.prioridad === null ? '' : filtros.prioridad ? 'si' : 'no'}
            opciones={[
              { valor: '', etiqueta: f.prioridades.todas },
              { valor: 'si', etiqueta: f.prioridades.si },
              { valor: 'no', etiqueta: f.prioridades.no },
            ]}
            alCambiar={(v) => cambiar({ prioridad: v === 'si' ? true : v === 'no' ? false : null })}
          />
          <CampoSelect
            etiqueta={f.estado}
            valor={filtros.estado ?? ''}
            opciones={[
              { valor: '', etiqueta: f.todos },
              ...Object.entries(panel.estados).map(([valor, etiqueta]) => ({ valor, etiqueta })),
            ]}
            alCambiar={(v) => cambiar({ estado: (v || null) as EstadoSeguimiento | null })}
          />
        </div>
      </div>

      {consulta.isError ? (
        <ErrorCarga error={consulta.error} alReintentar={() => void consulta.refetch()} />
      ) : null}

      {datos && datos.total === 0 ? (
        <EmptyState
          icon={<Inbox aria-hidden className="size-8" />}
          title={hayFiltros(filtros) || filtros.q ? t.vacioTitulo : t.vacioSinDatos}
          description={hayFiltros(filtros) || filtros.q ? t.vacioTexto : undefined}
        />
      ) : datos ? (
        <div
          className={cn(
            'flex flex-col gap-4',
            consulta.isPlaceholderData && 'opacity-60 transition-opacity',
          )}
          aria-busy={consulta.isFetching}
        >
          <div className="overflow-x-auto rounded-xl border border-piedra-200 bg-blanco">
            <table className="w-full min-w-[56rem] text-left text-pequeno">
              <caption className="sr-only">{t.titulo}</caption>
              <thead className="bg-piedra-50">
                <tr>
                  {visibles.map((c) => (
                    <Encabezado key={c} columna={c} filtros={filtros} alOrdenar={ordenar} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.filas.map((fila) => (
                  <Fila key={fila.id} fila={fila} visibles={visibles} volver={search} />
                ))}
              </tbody>
            </table>
          </div>

          <nav
            aria-label={t.pagina(filtros.pagina, paginas)}
            className="flex flex-wrap items-center justify-between gap-3 text-pequeno"
          >
            <p className="text-grafito-600 tabular-nums">
              {t.rango(
                formatearNumero(desde),
                formatearNumero(hasta),
                formatearNumero(datos.total),
              )}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <CampoSelect
                className="w-28"
                etiqueta={t.porPagina}
                valor={String(filtros.tamano)}
                opciones={TAMANOS.map((n) => ({ valor: String(n), etiqueta: String(n) }))}
                alCambiar={(v) => cambiar({ tamano: Number(v) })}
              />
              <Button
                variant="secundario"
                size="sm"
                disabled={filtros.pagina <= 1}
                onClick={() => cambiar({ pagina: filtros.pagina - 1 })}
              >
                <ChevronLeft aria-hidden className="size-4" />
                {t.anterior}
              </Button>
              <span className="text-grafito-600 tabular-nums">
                {t.pagina(filtros.pagina, paginas)}
              </span>
              <Button
                variant="secundario"
                size="sm"
                disabled={filtros.pagina >= paginas}
                onClick={() => cambiar({ pagina: filtros.pagina + 1 })}
              >
                {t.siguiente}
                <ChevronRight aria-hidden className="size-4" />
              </Button>
            </div>
          </nav>
        </div>
      ) : consulta.isPending ? (
        <div
          aria-busy="true"
          className="flex flex-col gap-2 rounded-xl border border-piedra-200 bg-blanco p-4"
        >
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : null}
    </PaginaPanel>
  );
}

function Encabezado({
  columna,
  filtros,
  alOrdenar,
}: {
  columna: Columna;
  filtros: FiltrosRegistros;
  alOrdenar: (o: OrdenRegistros) => void;
}) {
  const orden = ORDENABLES[columna];
  const activo = orden !== undefined && filtros.orden === orden;
  const Icono = !activo ? ArrowUpDown : filtros.descendente ? ArrowDown : ArrowUp;
  return (
    <th
      scope="col"
      aria-sort={activo ? (filtros.descendente ? 'descending' : 'ascending') : undefined}
      className="px-3 py-2 font-semibold whitespace-nowrap text-grafito-900"
    >
      {orden ? (
        <button
          type="button"
          onClick={() => alOrdenar(orden)}
          className="-mx-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 hover:bg-piedra-100"
        >
          {t.columnas[columna]}
          <Icono aria-hidden className={cn('size-4', !activo && 'text-grafito-500')} />
        </button>
      ) : (
        t.columnas[columna]
      )}
    </th>
  );
}

function Fila({
  fila,
  visibles,
  volver,
}: {
  fila: FilaRegistro;
  visibles: readonly Columna[];
  volver: string;
}) {
  const celda = (c: Columna) => {
    switch (c) {
      case 'fecha':
        return (
          <span className="whitespace-nowrap tabular-nums">{formatearFecha(fila.creadoEn)}</span>
        );
      case 'nombre':
        return (
          <Link
            to={`/panel/registros/${fila.id}`}
            state={{ volver }}
            className="font-semibold text-pizarra-700 underline-offset-4 hover:underline"
          >
            {fila.nombre}
          </Link>
        );
      case 'modulo':
        return panel.modulos[fila.modulo];
      case 'lugar':
        return fila.lugar ?? panel.sinDato;
      case 'resultado':
        return <ResultadoBadge resultado={fila.resultadoGeneral} />;
      case 'atencion':
        return <span className="tabular-nums">{fila.atencion}</span>;
      case 'prioridad':
        return fila.prioridad ? (
          <span className="inline-flex items-center gap-1 font-semibold text-nivel-atencion">
            <Flag aria-hidden className="size-4" />
            {t.conPrioridad}
          </span>
        ) : (
          <span className="sr-only">{panel.filtros.prioridades.no}</span>
        );
      case 'estado':
        return fila.estado ? panel.estados[fila.estado] : panel.sinSeguimiento;
      case 'asignado':
        return fila.asignado ?? panel.sinAsignar;
      case 'correo':
        return <span className="font-mono text-[0.8125rem]">{fila.correo ?? panel.sinDato}</span>;
      case 'telefono':
        return (
          <span className="font-mono text-[0.8125rem] whitespace-nowrap">
            {fila.telefono ?? panel.sinDato}
          </span>
        );
    }
  };
  return (
    <tr className="border-t border-piedra-200 hover:bg-piedra-50">
      {visibles.map((c) =>
        c === 'nombre' ? (
          <th key={c} scope="row" className="px-3 py-2 text-left font-normal">
            {celda(c)}
          </th>
        ) : (
          <td key={c} className="px-3 py-2 align-middle text-grafito-900">
            {celda(c)}
          </td>
        ),
      )}
    </tr>
  );
}

function SelectorColumnas({
  ocultas,
  alAlternar,
}: {
  ocultas: ReadonlySet<Columna>;
  alAlternar: (c: Columna) => void;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="secundario">
          <Columns3 aria-hidden className="size-4" />
          {t.columnasBoton}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-64 rounded-xl border border-piedra-200 bg-blanco p-4 shadow-3"
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-pequeno font-semibold text-grafito-900">
              {t.columnasTitulo}
            </legend>
            {OPCIONALES.map((c) => (
              <label
                key={c}
                className="flex min-h-11 cursor-pointer items-center gap-3 text-pequeno text-grafito-900"
              >
                <input
                  type="checkbox"
                  checked={!ocultas.has(c)}
                  onChange={() => alAlternar(c)}
                  className="size-5 accent-pizarra-700"
                />
                {t.columnas[c]}
              </label>
            ))}
          </fieldset>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
