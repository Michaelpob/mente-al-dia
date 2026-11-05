import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ClipboardList, Flag, Printer, TrendingDown, TrendingUp } from 'lucide-react';
import { useId, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { LeyendaNiveles, RuedaNiveles } from '@/components/bienestar/rueda-niveles';
import { PageMeta } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card } from '@/components/ui/card';
import { Callout, Eyebrow } from '@/components/ui/feedback';
import { NivelBadge } from '@/components/ui/nivel-badge';
import { panel } from '@/content/panel';
import { textos } from '@/content/textos-interfaz';
import { dimensiones } from '@/content/v1/areas';
import { cuestionarios } from '@/content/v1/cuestionarios';
import { mensajeDeArea } from '@/features/resultados/presentacion';
import { cn } from '@/lib/utils/cn';
import type { AreaId, Nivel } from '@/types/dominio';
import { ErrorCarga, PaginaPanel, ResultadoBadge } from '../compartido';
import { obtenerFicha, registrarImpresion } from '../datos/consultas';
import { formatearFecha } from '../datos/formato';
import type { Ficha } from '../datos/tipos';
import {
  cambiosFrenteAnterior,
  conteoDePersona,
  gruposDePersona,
  porDimension,
  type CambioArea,
  type GrupoPersona,
} from './analisis';

const t = panel.fortalezas;
const nombreDimension = new Map(dimensiones.map((d) => [d.id, d.nombre]));
/** Columnas de la tabla por dimensión: de lo que más cuidado necesita a lo que ya está bien. */
const COLUMNAS: readonly Nivel[] = ['requiere_atencion', 'por_fortalecer', 'adecuado', 'sin_dato'];

/**
 * /panel/registros/:id/fortalezas (D-83): las 20 preguntas de un cuestionario agrupadas en falencias,
 * por fortalecer y fortalezas, con lo que respondió la persona y la orientación que recibió.
 */
export default function FortalezasPage() {
  const { id = '' } = useParams();
  const volver = (useLocation().state as { volver?: string } | null)?.volver ?? null;
  const consulta = useQuery({
    queryKey: ['panel', 'ficha', id],
    queryFn: () => obtenerFicha(id),
    retry: (intentos, error) => (error as { code?: string }).code !== 'P0002' && intentos < 2,
  });
  // Como la ficha: la impresión queda en la auditoría antes de abrir el diálogo de impresión.
  const impresion = useMutation({
    mutationFn: () => registrarImpresion(id),
    onSuccess: () => window.print(),
  });
  const [activa, setActiva] = useState<AreaId | null>(null);

  const destino = volver?.startsWith('/panel/') ? volver : '/panel/censo';
  const enlaceVolver = (
    <Link
      to={destino}
      className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-pizarra-700 underline-offset-4 hover:underline print:hidden"
    >
      <ArrowLeft aria-hidden className="size-4" />
      {destino.startsWith('/panel/registros/') ? t.volverFicha : t.volverCenso}
    </Link>
  );

  if (consulta.isError) {
    const noExiste = (consulta.error as { code?: string }).code === 'P0002';
    return (
      <PaginaPanel>
        <PageMeta title={t.eyebrow} indexable={false} />
        {enlaceVolver}
        {noExiste ? (
          <Callout>{panel.ficha.noExiste}</Callout>
        ) : (
          <ErrorCarga error={consulta.error} alReintentar={() => void consulta.refetch()} />
        )}
      </PaginaPanel>
    );
  }
  if (!consulta.data) return null;
  const ficha = consulta.data;
  const niveles = ficha.resultado.niveles ?? {};
  const conteo = conteoDePersona(niveles);
  const grupos = gruposDePersona(niveles);

  // Lleva a la tarjeta del área elegida en la rueda (la rueda es solo para el puntero).
  const irArea = (area: AreaId) => {
    const tarjeta = document.getElementById(`area-${area}`);
    tarjeta?.scrollIntoView({ block: 'center' });
    tarjeta?.focus({ preventScroll: true });
  };

  return (
    <PaginaPanel>
      <PageMeta title={`${t.eyebrow}: ${ficha.nombre}`} indexable={false} />
      <p className="hidden border-y-2 border-grafito-900 py-2 text-center font-bold tracking-wide uppercase print:block">
        {panel.confidencial}
      </p>
      {enlaceVolver}

      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <Eyebrow>{t.eyebrow}</Eyebrow>
            <h1 className="text-h2 text-balance text-pizarra-700">{ficha.nombre}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <ResultadoBadge resultado={ficha.resultadoGeneral} />
              {ficha.prioridad ? (
                <span className="inline-flex items-center gap-1 rounded-pill bg-nivel-atencion-fondo px-2.5 py-0.5 text-pequeno font-semibold text-nivel-atencion">
                  <Flag aria-hidden className="size-3.5" />
                  {panel.registros.conPrioridad}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <Link
              to={`/panel/registros/${ficha.id}`}
              className={buttonVariants({ variant: 'secundario' })}
            >
              <ClipboardList aria-hidden className="size-4" />
              {t.verFicha}
            </Link>
            <Button
              variant="secundario"
              onClick={() => impresion.mutate()}
              disabled={impresion.isPending}
            >
              <Printer aria-hidden className="size-4" />
              {impresion.isPending ? t.imprimiendo : t.imprimir}
            </Button>
          </div>
        </div>
        {impresion.isError ? <Callout variant="apoyo">{t.errorImprimir}</Callout> : null}

        <dl className="grid gap-x-6 gap-y-3 rounded-xl border border-piedra-200 bg-blanco p-4 text-pequeno sm:grid-cols-2 lg:grid-cols-4">
          <Dato termino={panel.ficha.modulo}>{panel.modulos[ficha.modulo]}</Dato>
          <Dato termino={panel.ficha.edad}>
            {ficha.edad === null ? panel.sinDato : panel.ficha.anos(ficha.edad)}
          </Dato>
          {ficha.modulo !== 'adulto' ? (
            <Dato termino={panel.ficha.grado}>{ficha.grado ?? panel.sinDato}</Dato>
          ) : null}
          <Dato termino={panel.ficha.lugar}>{ficha.lugar ?? panel.sinDato}</Dato>
          <Dato termino={t.cuestionarioDel(formatearFecha(ficha.creadoEn))}>
            <span className="font-mono">{ficha.codigo}</span>
            {ficha.historial.length > 1 ? (
              <span className="block font-normal text-grafito-600">
                {t.respondio(ficha.historial.length)}
              </span>
            ) : null}
          </Dato>
        </dl>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] print:grid-cols-1">
        <Card className="flex flex-col gap-4 bg-blanco p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-h4 text-grafito-900">{t.rueda.titulo}</h2>
            <p className="text-pequeno text-grafito-600">
              {t.resumen(
                conteo.requiere_atencion,
                conteo.por_fortalecer,
                conteo.adecuado,
                conteo.sin_dato,
              )}
            </p>
          </div>
          <RuedaNiveles
            className="max-w-[18rem] print:max-w-[14rem]"
            niveles={niveles}
            centro={{ titulo: t.rueda.centro, detalle: t.rueda.detalle }}
            activa={activa}
            onActivar={setActiva}
            onElegir={irArea}
          />
          <LeyendaNiveles etiqueta={t.leyenda} className="justify-center" />
        </Card>
        <div className="flex min-w-0 flex-col gap-6">
          <TablaDimensiones niveles={niveles} conSinDato={conteo.sin_dato > 0} />
          <Cambios ficha={ficha} />
        </div>
      </div>

      {grupos.map((grupo) => (
        <GrupoAreas key={grupo.nivel} grupo={grupo} ficha={ficha} />
      ))}

      <Historial ficha={ficha} />

      <p className="hidden border-t-2 border-grafito-900 pt-2 text-center text-pequeno font-bold print:block">
        {panel.confidencial} · {panel.aviso}
      </p>
    </PaginaPanel>
  );
}

function Dato({ termino, children }: { termino: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-grafito-600">{termino}</dt>
      <dd className="font-semibold break-words text-grafito-900">{children}</dd>
    </div>
  );
}

function TablaDimensiones({
  niveles,
  conSinDato,
}: {
  niveles: Partial<Record<AreaId, Nivel>>;
  conSinDato: boolean;
}) {
  const idTitulo = useId();
  const columnas = COLUMNAS.filter((n) => n !== 'sin_dato' || conSinDato);
  return (
    <Card className="flex flex-col gap-3 bg-blanco p-5">
      <div className="flex flex-col gap-1">
        <h2 id={idTitulo} className="text-h4 text-grafito-900">
          {t.dimensiones.titulo}
        </h2>
        <p className="text-pequeno text-grafito-600">{t.dimensiones.descripcion}</p>
      </div>
      {/* En el teléfono la tabla se desplaza: el teclado también debe poder llegar a ella. */}
      <div
        role="region"
        aria-labelledby={idTitulo}
        tabIndex={0}
        className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-pizarra-700"
      >
        <table className="w-full min-w-[28rem] text-left text-pequeno">
          <thead className="bg-piedra-50">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">
                {t.dimensiones.columna}
              </th>
              {columnas.map((nivel) => (
                <th key={nivel} scope="col" className="px-3 py-2 text-center font-semibold">
                  {panel.censo.nivelesPlural[nivel]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {porDimension(niveles).map(({ dimension, conteo }) => (
              <tr key={dimension.id} className="border-t border-piedra-200">
                <th scope="row" className="px-3 py-2 text-left font-normal text-grafito-900">
                  {dimension.nombre}
                </th>
                {columnas.map((nivel) => (
                  <td
                    key={nivel}
                    className={cn(
                      'px-3 py-2 text-center tabular-nums',
                      conteo[nivel] ? 'font-semibold text-grafito-900' : 'text-grafito-600',
                    )}
                  >
                    {conteo[nivel]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Cambios({ ficha }: { ficha: Ficha }) {
  const idTitulo = useId();
  const historial = [...ficha.historial].sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
  const posicion = historial.findIndex((h) => h.id === ficha.id);
  const anterior = posicion > 0 ? historial[posicion - 1] : undefined;
  if (!anterior?.niveles) return null;
  const { mejoras, retrocesos } = cambiosFrenteAnterior(
    ficha.resultado.niveles ?? {},
    anterior.niveles,
  );

  return (
    <Card role="region" aria-labelledby={idTitulo} className="flex flex-col gap-3 bg-blanco p-5">
      <div className="flex flex-col gap-1">
        <h2 id={idTitulo} className="text-h4 text-grafito-900">
          {t.cambios.titulo}
        </h2>
        <p className="text-pequeno text-grafito-600">
          {t.cambios.comparado(formatearFecha(anterior.creadoEn))}
        </p>
      </div>
      {mejoras.length === 0 && retrocesos.length === 0 ? (
        <p className="text-grafito-600">{t.cambios.ninguno}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <ListaCambios titulo={t.cambios.mejoro} cambios={mejoras} Icono={TrendingUp} />
          <ListaCambios titulo={t.cambios.empeoro} cambios={retrocesos} Icono={TrendingDown} />
        </div>
      )}
    </Card>
  );
}

function ListaCambios({
  titulo,
  cambios,
  Icono,
}: {
  titulo: string;
  cambios: CambioArea[];
  Icono: typeof TrendingUp;
}) {
  if (cambios.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="inline-flex items-center gap-2 text-pequeno font-bold text-grafito-900">
        <Icono aria-hidden className="size-4" />
        {titulo} ({cambios.length})
      </h3>
      <ul className="flex flex-col gap-1.5 text-pequeno">
        {cambios.map((c) => (
          <li key={c.area.id}>
            <span className="font-semibold text-grafito-900">{c.area.nombre}</span>{' '}
            <span className="text-grafito-600">
              {t.cambios.detalle(textos.niveles[c.antes], textos.niveles[c.ahora])}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GrupoAreas({ grupo, ficha }: { grupo: GrupoPersona; ficha: Ficha }) {
  const textosGrupo = t.grupos[grupo.nivel];
  const cuestionario = cuestionarios[ficha.modulo];
  const respuestas = new Map(ficha.respuestas.map((r) => [r.areaId, r.valor]));
  const etiqueta = new Map(cuestionario.opciones.map((o) => [o.valor, o.etiqueta]));
  const preguntas = new Map(cuestionario.preguntas.map((p) => [p.areaId, p.texto]));
  const idTitulo = `grupo-${grupo.nivel}`;
  const conOrientacion = grupo.nivel === 'requiere_atencion' || grupo.nivel === 'por_fortalecer';

  return (
    <section aria-labelledby={idTitulo} className="flex flex-col gap-3 print:break-inside-avoid">
      <div className="flex flex-col gap-1">
        <h2 id={idTitulo} className="text-h3 text-grafito-900">
          {textosGrupo.titulo}{' '}
          <span className="font-cuerpo text-cuerpo font-normal text-grafito-600">
            ({grupo.areas.length})
          </span>
        </h2>
        <p className="text-pequeno text-grafito-600">{textosGrupo.detalle}</p>
      </div>
      {grupo.areas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-piedra-200 px-4 py-3 text-grafito-600">
          {textosGrupo.vacio}
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {grupo.areas.map((area) => {
            const valor = respuestas.get(area.id);
            return (
              <li key={area.id} className="min-w-0">
                <article
                  id={`area-${area.id}`}
                  tabIndex={-1}
                  aria-labelledby={`area-${area.id}-nombre`}
                  className="flex h-full flex-col gap-3 rounded-xl border border-piedra-200 bg-blanco p-4 outline-offset-2 focus-visible:outline-2 focus-visible:outline-pizarra-700 print:break-inside-avoid"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="text-[0.8125rem] text-grafito-600">
                        {t.numeroArea(area.numero)} · {nombreDimension.get(area.dimension)}
                      </p>
                      <h3
                        id={`area-${area.id}-nombre`}
                        className="text-cuerpo font-bold text-grafito-900"
                      >
                        {area.nombre}
                      </h3>
                    </div>
                    <NivelBadge nivel={grupo.nivel} size="sm" />
                  </div>
                  <dl className="flex flex-col gap-2 text-pequeno">
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-grafito-600">{t.pregunta}</dt>
                      <dd className="text-grafito-900">{preguntas.get(area.id)}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-grafito-600">{t.respuesta}</dt>
                      <dd className="font-semibold text-grafito-900">
                        {valor ? (etiqueta.get(valor) ?? valor) : t.sinRespuesta}
                      </dd>
                    </div>
                  </dl>
                  {conOrientacion ? (
                    <details className="text-pequeno">
                      <summary className="min-h-11 cursor-pointer content-center font-semibold text-pizarra-700">
                        {t.orientacion}
                      </summary>
                      <p className="text-grafito-900">
                        {mensajeDeArea(ficha.modulo, area.id, grupo.nivel)}
                      </p>
                    </details>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Historial({ ficha }: { ficha: Ficha }) {
  const idTitulo = useId();
  if (ficha.historial.length <= 1) return null;
  return (
    <section aria-labelledby={idTitulo} className="flex flex-col gap-3 print:hidden">
      <h2 id={idTitulo} className="text-h4 text-grafito-900">
        {t.historial.titulo}
      </h2>
      <ol className="flex flex-col gap-2">
        {ficha.historial.map((h) => (
          <li
            key={h.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-piedra-200 bg-blanco px-4 py-3 text-pequeno"
          >
            <span className="text-grafito-600 tabular-nums">{formatearFecha(h.creadoEn)}</span>
            <span className="font-mono">{h.codigo}</span>
            <ResultadoBadge resultado={h.resultadoGeneral} />
            {h.id === ficha.id ? (
              <span className="font-semibold text-pizarra-700">{t.historial.este}</span>
            ) : (
              <Link
                to={`/panel/registros/${h.id}/fortalezas`}
                className="font-semibold text-pizarra-700 underline-offset-4 hover:underline"
              >
                {t.historial.ver}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
