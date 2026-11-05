import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, FilterX, Flag, Inbox, Search } from 'lucide-react';
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
import { obtenerCenso, obtenerOpcionesLugar, obtenerPersonasCenso } from '../datos/consultas';
import {
  CENSO_POR_DEFECTO,
  MODULOS,
  PERIODOS_CENSO,
  TAMANOS,
  escribirFiltrosCenso,
  hoyEnColombia,
  leerFiltrosCenso,
  moduloDeFiltro,
  periodoCensoDe,
  sumarDias,
} from '../datos/filtros';
import { formatearFecha, formatearNumero, formatearPorcentaje } from '../datos/formato';
import {
  ORDENES_CENSO,
  type Censo,
  type FiltrosCenso,
  type FiltrosPersonasCenso,
  type OrdenCenso,
  type PaginaCenso,
  type PersonaCenso,
} from '../datos/tipos';
import { Indicador } from '../tablero/indicadores';
import { NIVELES_CENSO, ordenarGrados, resumenAreas } from './analisis';
import { AreasCenso, ListaBarras } from './piezas';

const c = panel.censo;
const f = panel.filtros;
/** Al elegir solo un nivel, se filtra desde la primera área (la base pide área y nivel juntos). */
const AREA_INICIAL: AreaId = 'bienestar_emocional';
const areasEnOrden = [...areas].sort((a, b) => a.numero - b.numero);
const nombreArea = new Map(areas.map((a) => [a.id, a.nombre]));
const ID_LISTA = 'lista-censo-titulo';

/**
 * /panel/censo (D-83): quiénes respondieron el cuestionario, una vez por persona, y sus fortalezas
 * y falencias por área. Los filtros van en la dirección, como en los registros.
 */
export default function CensoPage() {
  const [params, setParams] = useSearchParams();
  const { search } = useLocation();
  const filtros = leerFiltrosCenso(params);
  const hoy = useMemo(() => hoyEnColombia(), []);
  const periodo = periodoCensoDe(filtros, hoy);
  const [elegirFechas, setElegirFechas] = useState(false);
  const mostrarFechas = elegirFechas || periodo === 'personalizado';

  const base: FiltrosCenso = {
    desde: filtros.desde,
    hasta: filtros.hasta,
    modulo: filtros.modulo,
    lugar: filtros.lugar,
  };
  const resumen = useQuery({
    queryKey: ['panel', 'censo', 'resumen', base],
    queryFn: () => obtenerCenso(base),
    placeholderData: keepPreviousData,
  });
  const personas = useQuery({
    queryKey: ['panel', 'censo', 'personas', filtros],
    queryFn: () => obtenerPersonasCenso(filtros),
    placeholderData: keepPreviousData,
  });
  const lugares = useQuery({
    queryKey: ['panel', 'lugares'],
    queryFn: () => obtenerOpcionesLugar(hoy),
    staleTime: 5 * 60_000,
  });

  const cambiar = (nuevos: Partial<FiltrosPersonasCenso>) =>
    setParams(escribirFiltrosCenso({ ...filtros, pagina: 1, ...nuevos }));

  /** Desde un área del resumen: la lista muestra quiénes la tienen como falencia. */
  const verFalencias = (area: AreaId) => {
    cambiar({ area, nivel: 'requiere_atencion', q: '' });
    requestAnimationFrame(() => {
      const titulo = document.getElementById(ID_LISTA);
      titulo?.scrollIntoView({ block: 'start' });
      titulo?.focus({ preventScroll: true });
    });
  };

  const opcionesLugar = [
    { valor: '', etiqueta: f.todos },
    ...[...new Set([...(filtros.lugar ? [filtros.lugar] : []), ...(lugares.data ?? [])])].map(
      (l) => ({ valor: l, etiqueta: l }),
    ),
  ];
  const hayFiltrosBase = Boolean(filtros.desde || filtros.hasta || filtros.modulo || filtros.lugar);
  const censoVacio = resumen.data?.personas === 0;

  return (
    <PaginaPanel>
      <PageMeta title={c.titulo} indexable={false} />
      <EncabezadoPanel titulo={c.titulo} descripcion={c.descripcion} />

      <section
        aria-label={f.titulo}
        className="grid gap-4 rounded-xl border border-piedra-200 bg-blanco p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <CampoSelect
          etiqueta={c.periodo}
          valor={mostrarFechas ? 'personalizado' : String(periodo)}
          opciones={[
            { valor: 'todo', etiqueta: c.periodos.todo },
            ...PERIODOS_CENSO.map((n) => ({ valor: String(n), etiqueta: c.periodos[n] })),
            { valor: 'personalizado', etiqueta: c.periodos.personalizado },
          ]}
          alCambiar={(valor) => {
            if (valor === 'personalizado') return setElegirFechas(true);
            setElegirFechas(false);
            if (valor === 'todo') cambiar({ desde: null, hasta: null });
            else cambiar({ desde: sumarDias(hoy, 1 - Number(valor)), hasta: hoy });
          }}
        />
        <CampoSelect
          etiqueta={f.modulo}
          valor={filtros.modulo ?? ''}
          opciones={[
            { valor: '', etiqueta: f.todos },
            ...MODULOS.map((m) => ({ valor: m, etiqueta: panel.modulos[m] })),
          ]}
          alCambiar={(valor) => cambiar({ modulo: moduloDeFiltro(valor) })}
        />
        <CampoSelect
          etiqueta={f.lugar}
          valor={filtros.lugar ?? ''}
          opciones={opcionesLugar}
          alCambiar={(valor) => cambiar({ lugar: valor || null })}
        />
        {mostrarFechas ? (
          <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-1">
            <CampoFecha
              etiqueta={f.desde}
              valor={filtros.desde ?? ''}
              max={filtros.hasta ?? hoy}
              alCambiar={(desde) => cambiar({ desde: desde || null })}
            />
            <CampoFecha
              etiqueta={f.hasta}
              valor={filtros.hasta ?? ''}
              min={filtros.desde ?? undefined}
              max={hoy}
              alCambiar={(hasta) => cambiar({ hasta: hasta || null })}
            />
          </div>
        ) : null}
      </section>

      {resumen.isError ? (
        <ErrorCarga error={resumen.error} alReintentar={() => void resumen.refetch()} />
      ) : null}

      {censoVacio ? (
        <EmptyState
          icon={<Inbox aria-hidden className="size-8" />}
          title={hayFiltrosBase ? c.lista.vacioTitulo : c.lista.vacioSinDatos}
          description={hayFiltrosBase ? c.lista.vacioTexto : undefined}
        />
      ) : resumen.data ? (
        <div
          className={cn(
            'flex flex-col gap-6',
            resumen.isPlaceholderData && 'opacity-60 transition-opacity',
          )}
        >
          <Resumen censo={resumen.data} modulo={filtros.modulo} />
          <AreasCenso resumen={resumenAreas(resumen.data.areas)} alElegir={verFalencias} />
        </div>
      ) : resumen.isPending ? (
        <div aria-busy="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : null}

      {censoVacio ? null : (
        <ListaPersonas
          filtros={filtros}
          consulta={personas}
          volver={`/panel/censo${search}`}
          alCambiar={cambiar}
        />
      )}
    </PaginaPanel>
  );
}

function Resumen({ censo, modulo }: { censo: Censo; modulo: FiltrosCenso['modulo'] }) {
  const parte = (n: number) => c.indicadores.parte(formatearPorcentaje(n / censo.personas));
  const menores = censo.porSexo.reduce((suma, s) => suma + s.n, 0);
  const conEdad = censo.porEdad.reduce((suma, e) => suma + e.n, 0);
  const sinFalencias = censo.personas - censo.conFalencias;

  return (
    <>
      <section
        aria-label={c.indicadores.titulo}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Indicador titulo={c.indicadores.personas} valor={censo.personas}>
          <p className="text-pequeno text-grafito-600">
            {c.indicadores.cuestionarios(formatearNumero(censo.cuestionarios))}
          </p>
        </Indicador>
        <Indicador titulo={c.indicadores.conFalencias} valor={censo.conFalencias}>
          <p className="text-pequeno text-grafito-600">{parte(censo.conFalencias)}</p>
        </Indicador>
        <Indicador titulo={c.indicadores.sinFalencias} valor={sinFalencias}>
          <p className="text-pequeno text-grafito-600">
            {parte(sinFalencias)}. {c.indicadores.sinFalenciasNota}
          </p>
        </Indicador>
        <Indicador titulo={c.indicadores.conPrioridad} valor={censo.conPrioridad}>
          <p className="text-pequeno text-grafito-600">{c.indicadores.conPrioridadNota}</p>
        </Indicador>
      </section>

      <section aria-labelledby="censo-quienes" className="flex flex-col gap-4">
        <h2 id="censo-quienes" className="text-h3 text-grafito-900">
          {c.quienes.titulo}
        </h2>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <ListaBarras
            titulo={c.quienes.modulo}
            nota={c.quienes.moduloNota}
            total={censo.personas}
            filas={MODULOS.filter((m) => !modulo || m === modulo).map((m) => ({
              etiqueta: panel.modulos[m],
              n: censo.porModulo[m] ?? 0,
            }))}
          />
          <ListaBarras
            titulo={c.quienes.lugar}
            nota={c.quienes.lugarNota}
            total={censo.personas}
            filas={censo.lugares.map((l) => ({ etiqueta: l.lugar, n: l.n }))}
          />
          <ListaBarras
            titulo={c.quienes.edad}
            nota={c.quienes.edadNota}
            total={conEdad}
            filas={censo.porEdad.map((e) => ({ etiqueta: c.quienes.anos(e.edad), n: e.n }))}
          />
          <ListaBarras
            titulo={c.quienes.sexo}
            nota={c.quienes.sexoNota}
            total={menores}
            filas={censo.porSexo.map((s) => ({
              etiqueta: s.sexo ?? c.quienes.sinResponder,
              n: s.n,
            }))}
          />
          <ListaBarras
            titulo={c.quienes.grado}
            nota={c.quienes.gradoNota}
            total={menores}
            filas={ordenarGrados(censo.porGrado).map((g) => ({ etiqueta: g.grado, n: g.n }))}
          />
        </div>
      </section>
    </>
  );
}

const ESTILO_CONTEO: Record<Exclude<Nivel, 'sin_dato'>, string> = {
  adecuado: 'bg-nivel-adecuado-fondo text-nivel-adecuado',
  por_fortalecer: 'bg-nivel-fortalecer-fondo text-nivel-fortalecer',
  requiere_atencion: 'bg-nivel-atencion-fondo text-nivel-atencion',
};

function Conteo({ nivel, n }: { nivel: Exclude<Nivel, 'sin_dato'>; n: number }) {
  return (
    <span
      className={cn(
        'inline-flex min-w-9 items-center justify-center rounded-pill px-2.5 py-0.5 text-pequeno font-semibold tabular-nums contraste-alto:border contraste-alto:border-current',
        n ? ESTILO_CONTEO[nivel] : 'text-grafito-600',
      )}
    >
      {n}
    </span>
  );
}

function ListaPersonas({
  filtros,
  consulta,
  volver,
  alCambiar,
}: {
  filtros: FiltrosPersonasCenso;
  consulta: UseQueryResult<PaginaCenso>;
  volver: string;
  alCambiar: (nuevos: Partial<FiltrosPersonasCenso>) => void;
}) {
  const t = c.lista;
  const datos = consulta.data;
  const paginas = datos ? Math.max(1, Math.ceil(datos.total / filtros.tamano)) : 1;
  const desde = datos && datos.total ? (filtros.pagina - 1) * filtros.tamano + 1 : 0;
  const hasta = datos ? Math.min(datos.total, filtros.pagina * filtros.tamano) : 0;
  const filtrada = Boolean(filtros.q || filtros.area);

  const buscar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    alCambiar({ q: String(new FormData(e.currentTarget).get('q') ?? '') });
  };

  return (
    <section aria-labelledby={ID_LISTA} className="flex scroll-mt-24 flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={ID_LISTA} tabIndex={-1} className="text-h3 text-grafito-900 outline-none">
          {t.titulo}
        </h2>
        {datos ? (
          <p className="text-grafito-600 tabular-nums">{t.total(formatearNumero(datos.total))}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-piedra-200 bg-blanco p-4">
        <form key={filtros.q} role="search" onSubmit={buscar} className="flex min-w-0 gap-2">
          <label htmlFor="busqueda-censo" className="sr-only">
            {t.buscar}
          </label>
          <input
            id="busqueda-censo"
            name="q"
            type="search"
            defaultValue={filtros.q}
            placeholder={t.buscarPlaceholder}
            className={fieldControlClasses}
          />
          <Button type="submit" variant="secundario">
            <Search aria-hidden className="size-4" />
            {panel.busqueda.boton}
          </Button>
        </form>
        <div className="grid gap-4 sm:grid-cols-3">
          <CampoSelect
            etiqueta={t.area}
            valor={filtros.area ?? ''}
            opciones={[
              { valor: '', etiqueta: f.todas },
              ...areasEnOrden.map((a) => ({ valor: a.id, etiqueta: a.nombre })),
            ]}
            alCambiar={(v) =>
              alCambiar({
                area: (v || null) as AreaId | null,
                nivel: v ? (filtros.nivel ?? 'requiere_atencion') : null,
              })
            }
          />
          <CampoSelect
            etiqueta={t.nivel}
            valor={filtros.nivel ?? ''}
            opciones={[
              { valor: '', etiqueta: f.todos },
              ...NIVELES_CENSO.map((n) => ({ valor: n, etiqueta: c.niveles[n] })),
            ]}
            alCambiar={(v) =>
              alCambiar({
                nivel: (v || null) as Nivel | null,
                area: v ? (filtros.area ?? AREA_INICIAL) : null,
              })
            }
          />
          <CampoSelect
            etiqueta={t.orden}
            valor={filtros.orden}
            opciones={ORDENES_CENSO.map((o) => ({ valor: o, etiqueta: t.ordenes[o] }))}
            alCambiar={(v) => alCambiar({ orden: v as OrdenCenso })}
          />
        </div>
        {filtros.area && filtros.nivel ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-piedra-50 px-3 py-2 text-pequeno text-grafito-900">
            <span>
              {t.filtro(nombreArea.get(filtros.area) ?? filtros.area, c.niveles[filtros.nivel])}
            </span>
            <Button
              variant="enlace"
              size="sm"
              onClick={() => alCambiar({ area: null, nivel: null })}
            >
              <FilterX aria-hidden className="size-4" />
              {t.quitarFiltro}
            </Button>
          </div>
        ) : null}
      </div>

      {consulta.isError ? (
        <ErrorCarga error={consulta.error} alReintentar={() => void consulta.refetch()} />
      ) : null}

      {datos && datos.total === 0 ? (
        <EmptyState
          icon={<Inbox aria-hidden className="size-8" />}
          title={filtrada ? t.vacioTitulo : t.vacioSinDatos}
          description={filtrada ? t.vacioTexto : undefined}
          action={
            filtrada ? (
              <Button
                variant="secundario"
                onClick={() => alCambiar({ q: CENSO_POR_DEFECTO.q, area: null, nivel: null })}
              >
                <FilterX aria-hidden className="size-4" />
                {t.quitarFiltro}
              </Button>
            ) : undefined
          }
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
            <table className="w-full min-w-[60rem] text-left text-pequeno">
              <caption className="sr-only">{t.titulo}</caption>
              <thead className="bg-piedra-50">
                <tr>
                  {Object.values(t.columnas).map((columna) => (
                    <th
                      key={columna}
                      scope="col"
                      className="px-3 py-2 font-semibold whitespace-nowrap text-grafito-900"
                    >
                      {columna}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.filas.map((persona) => (
                  <FilaPersona key={persona.id} persona={persona} volver={volver} />
                ))}
              </tbody>
            </table>
          </div>

          <nav
            aria-label={panel.registros.pagina(filtros.pagina, paginas)}
            className="flex flex-wrap items-center justify-between gap-3 text-pequeno"
          >
            <p className="text-grafito-600 tabular-nums">
              {panel.registros.rango(
                formatearNumero(desde),
                formatearNumero(hasta),
                formatearNumero(datos.total),
              )}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <CampoSelect
                className="w-28"
                etiqueta={panel.registros.porPagina}
                valor={String(filtros.tamano)}
                opciones={TAMANOS.map((n) => ({ valor: String(n), etiqueta: String(n) }))}
                alCambiar={(v) => alCambiar({ tamano: Number(v) })}
              />
              <Button
                variant="secundario"
                size="sm"
                disabled={filtros.pagina <= 1}
                onClick={() => alCambiar({ pagina: filtros.pagina - 1 })}
              >
                <ChevronLeft aria-hidden className="size-4" />
                {panel.registros.anterior}
              </Button>
              <span className="text-grafito-600 tabular-nums">
                {panel.registros.pagina(filtros.pagina, paginas)}
              </span>
              <Button
                variant="secundario"
                size="sm"
                disabled={filtros.pagina >= paginas}
                onClick={() => alCambiar({ pagina: filtros.pagina + 1 })}
              >
                {panel.registros.siguiente}
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
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function FilaPersona({ persona, volver }: { persona: PersonaCenso; volver: string }) {
  const t = c.lista;
  const falencias = areasEnOrden.filter((a) => persona.niveles[a.id] === 'requiere_atencion');
  return (
    <tr className="border-t border-piedra-200 align-top hover:bg-piedra-50">
      <th scope="row" className="px-3 py-2 text-left font-normal">
        <Link
          to={`/panel/registros/${persona.id}/fortalezas`}
          state={{ volver }}
          className="font-semibold text-pizarra-700 underline-offset-4 hover:underline"
        >
          {persona.nombre}
        </Link>
        {persona.prioridad ? (
          <span className="mt-0.5 flex items-center gap-1 text-[0.8125rem] font-semibold text-nivel-atencion">
            <Flag aria-hidden className="size-3.5" />
            {panel.registros.conPrioridad}
          </span>
        ) : null}
      </th>
      <td className="px-3 py-2 text-grafito-900">{panel.modulos[persona.modulo]}</td>
      <td className="px-3 py-2 whitespace-nowrap text-grafito-900 tabular-nums">
        {persona.edad === null ? panel.sinDato : panel.ficha.anos(persona.edad)}
      </td>
      <td className="px-3 py-2 text-grafito-900">{persona.lugar ?? panel.sinDato}</td>
      <td className="px-3 py-2 whitespace-nowrap text-grafito-900 tabular-nums">
        {formatearFecha(persona.creadoEn)}
        {persona.cuestionarios > 1 ? (
          <span className="block text-[0.8125rem] text-grafito-600">
            {t.veces(persona.cuestionarios)}
          </span>
        ) : null}
      </td>
      <td className="px-3 py-2">
        <ResultadoBadge resultado={persona.resultadoGeneral} />
      </td>
      <td className="px-3 py-2">
        <Conteo nivel="adecuado" n={persona.fortalezas} />
      </td>
      <td className="px-3 py-2">
        <Conteo nivel="por_fortalecer" n={persona.porFortalecer} />
      </td>
      <td className="px-3 py-2">
        <Conteo nivel="requiere_atencion" n={persona.falencias} />
        {falencias.length ? (
          <p className="mt-1 max-w-56 text-[0.8125rem] text-grafito-600">
            {falencias
              .slice(0, 3)
              .map((a) => a.nombre)
              .join(', ')}
            {falencias.length > 3 ? ` ${t.yMas(falencias.length - 3)}` : null}
          </p>
        ) : null}
      </td>
    </tr>
  );
}
