import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Eye, Flag, Printer } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router';
import { PageMeta } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Callout } from '@/components/ui/feedback';
import { NivelBadge } from '@/components/ui/nivel-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { panel } from '@/content/panel';
import { areas } from '@/content/v1/areas';
import { cuestionarios } from '@/content/v1/cuestionarios';
import type { Nivel } from '@/types/dominio';
import { ErrorCarga, PaginaPanel, ResultadoBadge } from '../compartido';
import { obtenerFicha, registrarImpresion, verDatosContacto } from '../datos/consultas';
import { formatearFecha, formatearFechaHora } from '../datos/formato';
import type { DatosContacto, Ficha } from '../datos/tipos';

const t = panel.ficha;
const nombreArea = new Map(areas.map((a) => [a.id, a]));

/** /panel/registros/:id: la ficha de una aplicación. */
export default function FichaPage() {
  const { id = '' } = useParams();
  const volver = (useLocation().state as { volver?: string } | null)?.volver ?? '';
  const consulta = useQuery({
    queryKey: ['panel', 'ficha', id],
    queryFn: () => obtenerFicha(id),
    retry: (intentos, error) => (error as { code?: string }).code !== 'P0002' && intentos < 2,
  });
  const contacto = useMutation({ mutationFn: () => verDatosContacto(id) });
  // La impresión queda en la auditoría antes de abrir el diálogo de impresión; si falla, no se imprime.
  const impresion = useMutation({
    mutationFn: () => registrarImpresion(id),
    onSuccess: () => window.print(),
  });

  const enlaceVolver = (
    <Link
      to={`/panel/registros${volver}`}
      className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-pizarra-700 underline-offset-4 hover:underline print:hidden"
    >
      <ArrowLeft aria-hidden className="size-4" />
      {t.volver}
    </Link>
  );

  if (consulta.isError) {
    const noExiste = (consulta.error as { code?: string }).code === 'P0002';
    return (
      <PaginaPanel>
        <PageMeta title={t.volver} indexable={false} />
        {enlaceVolver}
        {noExiste ? (
          <Callout>{t.noExiste}</Callout>
        ) : (
          <ErrorCarga error={consulta.error} alReintentar={() => void consulta.refetch()} />
        )}
      </PaginaPanel>
    );
  }
  if (!consulta.data) return null;
  const ficha = consulta.data;

  return (
    <PaginaPanel>
      <PageMeta title={ficha.nombre} indexable={false} />
      <p className="hidden border-y-2 border-grafito-900 py-2 text-center font-bold tracking-wide uppercase print:block">
        {panel.confidencial}
      </p>
      {enlaceVolver}

      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
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
          <Button
            variant="secundario"
            onClick={() => impresion.mutate()}
            disabled={impresion.isPending}
            className="print:hidden"
          >
            <Printer aria-hidden className="size-4" />
            {impresion.isPending ? t.imprimiendo : t.imprimir}
          </Button>
        </div>
        {impresion.isError ? <Callout variant="apoyo">{t.errorImprimir}</Callout> : null}

        <dl className="grid gap-x-6 gap-y-3 rounded-xl border border-piedra-200 bg-blanco p-4 text-pequeno sm:grid-cols-2 lg:grid-cols-3">
          <Dato termino={t.codigo}>
            <span className="font-mono">{ficha.codigo}</span>
          </Dato>
          <Dato termino={t.modulo}>{panel.modulos[ficha.modulo]}</Dato>
          <Dato termino={t.edad}>{ficha.edad === null ? panel.sinDato : t.anos(ficha.edad)}</Dato>
          {ficha.modulo === 'nino' ? (
            <Dato termino={t.grado}>{ficha.grado ?? panel.sinDato}</Dato>
          ) : null}
          <Dato termino={t.lugar}>{ficha.lugar ?? panel.sinDato}</Dato>
          <Dato termino={t.fecha}>{formatearFechaHora(ficha.creadoEn)}</Dato>
          <Dato termino={t.contacto}>
            <span className="font-mono">
              {[ficha.correo, ficha.telefono].filter(Boolean).join(' · ') || panel.sinDato}
            </span>
          </Dato>
        </dl>

        {contacto.data ? (
          <Contacto datos={contacto.data} />
        ) : (
          <div className="flex flex-col gap-2 print:hidden">
            <Button
              variant="secundario"
              className="self-start"
              onClick={() => contacto.mutate()}
              disabled={contacto.isPending}
            >
              <Eye aria-hidden className="size-4" />
              {contacto.isPending ? t.cargandoContacto : t.mostrarContacto}
            </Button>
            {contacto.isError ? (
              <ErrorCarga error={contacto.error} alReintentar={() => contacto.mutate()} />
            ) : null}
          </div>
        )}
      </header>

      <Tabs defaultValue="resultados" className="flex flex-col gap-4">
        <TabsList aria-label={t.pestanas.resultados} className="print:hidden">
          <TabsTrigger value="resultados">{t.pestanas.resultados}</TabsTrigger>
          <TabsTrigger value="historial">{t.pestanas.historial}</TabsTrigger>
          <TabsTrigger value="seguimiento">{t.pestanas.seguimiento}</TabsTrigger>
          <TabsTrigger value="autorizaciones">{t.pestanas.autorizaciones}</TabsTrigger>
        </TabsList>
        {/* Resultados siempre está montada: es lo que sale en la ficha impresa. */}
        <TabsContent
          value="resultados"
          forceMount
          className="data-[state=inactive]:hidden print:data-[state=inactive]:block"
        >
          <Resultados ficha={ficha} />
        </TabsContent>
        <TabsContent value="historial">
          <Historial ficha={ficha} />
        </TabsContent>
        <TabsContent value="seguimiento">
          <dl className="grid gap-x-6 gap-y-3 rounded-xl border border-piedra-200 bg-blanco p-4 text-pequeno sm:grid-cols-3">
            <Dato termino={t.estado}>
              {ficha.estado ? panel.estados[ficha.estado] : panel.sinSeguimiento}
            </Dato>
            <Dato termino={t.asignado}>{ficha.asignado ?? panel.sinAsignar}</Dato>
            <Dato termino={t.actualizado}>{formatearFechaHora(ficha.actualizadoEn)}</Dato>
          </dl>
          <Callout className="mt-4">{t.seguimientoFase9}</Callout>
        </TabsContent>
        <TabsContent value="autorizaciones" className="flex flex-col gap-3">
          <p className="text-grafito-600">{t.autorizacionesTexto}</p>
          <div
            role="region"
            aria-label={t.pestanas.autorizaciones}
            tabIndex={0}
            className="overflow-x-auto rounded-xl border border-piedra-200 bg-blanco focus-visible:outline-2 focus-visible:outline-pizarra-700"
          >
            <table className="w-full text-left text-pequeno">
              <thead className="bg-piedra-50">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    {t.columnasAutorizacion.tipo}
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    {t.columnasAutorizacion.version}
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    {t.columnasAutorizacion.fecha}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ficha.autorizaciones.map((a) => (
                  <tr key={a.tipo} className="border-t border-piedra-200">
                    <th scope="row" className="px-3 py-2 text-left font-normal">
                      {panel.autorizaciones[a.tipo]}
                    </th>
                    <td className="font-mono px-3 py-2">{a.version}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatearFechaHora(a.aceptadoEn)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
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

function Contacto({ datos }: { datos: DatosContacto }) {
  return (
    <Card className="flex flex-col gap-3 bg-blanco p-4" role="region" aria-label={t.contacto}>
      <dl className="grid gap-x-6 gap-y-3 text-pequeno sm:grid-cols-2 lg:grid-cols-4">
        <Dato termino={t.nombre}>{datos.nombre}</Dato>
        <Dato termino={t.correo}>{datos.correo ?? datos.acudiente?.correo ?? panel.sinDato}</Dato>
        <Dato termino={t.telefono}>
          {datos.telefono ?? datos.acudiente?.telefono ?? panel.sinDato}
        </Dato>
        <Dato termino={t.lugar}>
          {datos.lugarResidencia ?? datos.acudiente?.lugarResidencia ?? panel.sinDato}
        </Dato>
      </dl>
      {datos.acudiente ? (
        <div className="flex flex-col gap-2 border-t border-piedra-200 pt-3">
          <h2 className="text-pequeno font-bold text-grafito-900">{t.acudiente}</h2>
          <dl className="grid gap-x-6 gap-y-3 text-pequeno sm:grid-cols-2 lg:grid-cols-4">
            <Dato termino={t.nombre}>{datos.acudiente.nombre ?? panel.sinDato}</Dato>
            <Dato termino={t.parentesco}>{datos.acudiente.parentesco ?? panel.sinDato}</Dato>
            <Dato termino={t.correo}>{datos.acudiente.correo ?? panel.sinDato}</Dato>
            <Dato termino={t.telefono}>{datos.acudiente.telefono ?? panel.sinDato}</Dato>
          </dl>
        </div>
      ) : null}
      <p className="text-pequeno text-grafito-600">{t.contactoAuditoria}</p>
    </Card>
  );
}

function Resultados({ ficha }: { ficha: Ficha }) {
  const cuestionario = cuestionarios[ficha.modulo];
  const respuestas = new Map(ficha.respuestas.map((r) => [r.areaId, r.valor]));
  const etiquetaRespuesta = new Map(cuestionario.opciones.map((o) => [o.valor, o.etiqueta]));
  const conteo = ficha.resultado.conteo;
  const motivos = ficha.resultado.motivosPrioridad ?? [];
  const preguntas = [...cuestionario.preguntas].sort((a, b) => a.numero - b.numero);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col gap-2 bg-blanco p-4">
          <p className="text-pequeno text-grafito-600">{t.resultadoGeneral}</p>
          <ResultadoBadge resultado={ficha.resultadoGeneral} className="self-start" />
        </Card>
        <Card className="flex flex-col gap-1 bg-blanco p-4">
          <p className="text-pequeno text-grafito-600">{t.indice}</p>
          <p className="font-titulo text-h3 text-grafito-900">
            {ficha.indice === null ? panel.sinDato : t.deCien(ficha.indice)}
          </p>
          <p className="text-[0.8125rem] text-grafito-600">{t.indiceNota}</p>
        </Card>
        <Card className="flex flex-col gap-2 bg-blanco p-4 lg:col-span-2">
          <p className="text-pequeno text-grafito-600">
            {t.respondidas(
              ficha.resultado.respondidas ?? ficha.respuestas.length,
              preguntas.length,
            )}
          </p>
          {conteo ? (
            <ul className="flex flex-wrap gap-2">
              {(
                [
                  ['requiere_atencion', conteo.requiereAtencion],
                  ['por_fortalecer', conteo.porFortalecer],
                  ['adecuado', conteo.adecuado],
                  ['sin_dato', conteo.sinDato],
                ] as const
              ).map(([nivel, n]) => (
                <li key={nivel} className="flex items-center gap-1.5">
                  <NivelBadge nivel={nivel} size="sm" />
                  <span className="font-semibold tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </div>

      <Card className="flex flex-col gap-2 bg-blanco p-4">
        <h2 className="text-pequeno font-bold text-grafito-900">{t.motivos}</h2>
        {motivos.length ? (
          <ul className="flex list-disc flex-col gap-1 pl-5 text-grafito-900">
            {motivos.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        ) : (
          <p className="text-grafito-600">{t.sinMotivos}</p>
        )}
        {ficha.resultadoParcial ? (
          <p className="text-pequeno text-grafito-600">{t.parcial}</p>
        ) : null}
        {ficha.rutaAtencionEspecial ? (
          <p className="text-pequeno text-grafito-600">{t.rutaEspecial}</p>
        ) : null}
      </Card>

      <div
        role="region"
        aria-label={t.tablaAreas}
        tabIndex={0}
        className="overflow-x-auto rounded-xl border border-piedra-200 bg-blanco focus-visible:outline-2 focus-visible:outline-pizarra-700"
      >
        <table className="w-full min-w-[44rem] text-left text-pequeno">
          <caption className="px-3 py-2 text-left font-bold text-grafito-900">
            {t.tablaAreas}
          </caption>
          <thead className="bg-piedra-50">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">
                {t.columnas.numero}
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                {t.columnas.area}
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                {t.columnas.pregunta}
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                {t.columnas.respuesta}
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                {t.columnas.nivel}
              </th>
            </tr>
          </thead>
          <tbody>
            {preguntas.map((p) => {
              const valor = respuestas.get(p.areaId);
              const nivel: Nivel = ficha.resultado.niveles?.[p.areaId] ?? 'sin_dato';
              return (
                <tr key={p.numero} className="border-t border-piedra-200 align-top">
                  <td className="px-3 py-2 tabular-nums">{p.numero}</td>
                  <th scope="row" className="px-3 py-2 text-left font-semibold">
                    {nombreArea.get(p.areaId)?.nombre ?? p.areaId}
                  </th>
                  <td className="px-3 py-2 text-grafito-900">{p.texto}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {valor ? (etiquetaRespuesta.get(valor) ?? valor) : t.sinRespuesta}
                  </td>
                  <td className="px-3 py-2">
                    <NivelBadge nivel={nivel} size="sm" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[0.8125rem] text-grafito-600">
        {t.versiones(ficha.reglasVersion, ficha.instrumentoVersion)}
      </p>
    </div>
  );
}

function Historial({ ficha }: { ficha: Ficha }) {
  if (ficha.historial.length <= 1) return <Callout>{t.historialUnico}</Callout>;
  const ultimas = ficha.historial.slice(-4);
  const preguntas = [...cuestionarios[ficha.modulo].preguntas].sort((a, b) => a.numero - b.numero);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-grafito-600">{t.historialTexto}</p>
      <ol className="flex flex-col gap-2">
        {ficha.historial.map((h) => (
          <li
            key={h.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-piedra-200 bg-blanco px-4 py-3 text-pequeno"
          >
            <span className="text-grafito-600 tabular-nums">{formatearFecha(h.creadoEn)}</span>
            <span className="font-mono">{h.codigo}</span>
            <ResultadoBadge resultado={h.resultadoGeneral} />
            {h.indice !== null ? <span className="tabular-nums">{t.deCien(h.indice)}</span> : null}
            {h.id === ficha.id ? (
              <span className="font-semibold text-pizarra-700">{t.estaAplicacion}</span>
            ) : (
              <Link
                to={`/panel/registros/${h.id}`}
                className="font-semibold text-pizarra-700 underline-offset-4 hover:underline"
              >
                {panel.prioritarios.verFicha}
              </Link>
            )}
          </li>
        ))}
      </ol>
      <div
        role="region"
        aria-label={t.comparacion}
        tabIndex={0}
        className="overflow-x-auto rounded-xl border border-piedra-200 bg-blanco focus-visible:outline-2 focus-visible:outline-pizarra-700"
      >
        <table className="w-full min-w-[40rem] text-left text-pequeno">
          <caption className="px-3 py-2 text-left font-bold text-grafito-900">
            {t.comparacion}
          </caption>
          <thead className="bg-piedra-50">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">
                {t.columnas.area}
              </th>
              {ultimas.map((h) => (
                <th key={h.id} scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">
                  {formatearFecha(h.creadoEn)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preguntas.map((p) => (
              <tr key={p.areaId} className="border-t border-piedra-200">
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  {nombreArea.get(p.areaId)?.nombre ?? p.areaId}
                </th>
                {ultimas.map((h) => (
                  <td key={h.id} className="px-3 py-2">
                    <NivelBadge nivel={h.niveles?.[p.areaId] ?? 'sin_dato'} size="sm" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
