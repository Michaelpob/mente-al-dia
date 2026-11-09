import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, FilterX, ScrollText } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { PageMeta } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { panel } from '@/content/panel';
import { panelInstituciones } from '@/content/panel-instituciones';
import { cn } from '@/lib/utils/cn';
import { CampoFecha, CampoSelect, EncabezadoPanel, ErrorCarga, PaginaPanel } from '../compartido';
import { obtenerAuditoria } from '../datos/consultas';
import { escribirFiltrosAuditoria, leerFiltrosAuditoria } from '../datos/filtros';
import { formatearFechaHora, formatearNumero } from '../datos/formato';
import type { FilaAuditoria, FiltrosAuditoria } from '../datos/tipos';
import { useAlcance } from './alcance';
import { SelectorInstitucion } from './piezas';

const t = panelInstituciones.auditoria;
const roles = panelInstituciones.usuarios.roles;

const nombreAccion = (accion: string) => t.acciones[accion] ?? accion.replaceAll('_', ' ');
const nombreEntidad = (entidad: string) => t.entidades[entidad] ?? entidad.replaceAll('_', ' ');

/** Un valor del detalle en una línea legible (los objetos, como texto JSON corto). */
function valorLegible(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  const texto = JSON.stringify(valor);
  return texto.length > 160 ? `${texto.slice(0, 157)}…` : texto;
}

/**
 * /panel/auditoria (D-86), solo el administrador general: quién consultó, descargó o cambió qué y
 * cuándo, con filtros por institución (la elegida arriba), fecha y acción.
 */
export default function AuditoriaPage() {
  const [params, setParams] = useSearchParams();
  const filtros = leerFiltrosAuditoria(params);
  const { elegida } = useAlcance();

  const consulta = useQuery({
    queryKey: ['panel', 'auditoria', elegida, filtros],
    queryFn: () => obtenerAuditoria(filtros, elegida),
    placeholderData: keepPreviousData,
  });

  const cambiar = (nuevos: Partial<FiltrosAuditoria>) =>
    setParams(escribirFiltrosAuditoria({ ...filtros, pagina: 1, ...nuevos }));

  const datos = consulta.data;
  const paginas = datos ? Math.max(1, Math.ceil(datos.total / datos.tamano)) : 1;
  const hayFiltros = Boolean(filtros.desde || filtros.hasta || filtros.accion);
  const acciones = [
    ...new Set([...(filtros.accion ? [filtros.accion] : []), ...(datos?.acciones ?? [])]),
  ].sort((a, b) => nombreAccion(a).localeCompare(nombreAccion(b), 'es'));

  return (
    <PaginaPanel>
      <PageMeta title={t.titulo} indexable={false} />
      <EncabezadoPanel titulo={t.titulo} descripcion={t.descripcion}>
        <SelectorInstitucion />
      </EncabezadoPanel>

      <section
        aria-label={panel.filtros.titulo}
        className="grid gap-4 rounded-xl border border-piedra-200 bg-blanco p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <CampoFecha
          etiqueta={panel.filtros.desde}
          valor={filtros.desde ?? ''}
          max={filtros.hasta ?? undefined}
          alCambiar={(desde) => cambiar({ desde: desde || null })}
        />
        <CampoFecha
          etiqueta={panel.filtros.hasta}
          valor={filtros.hasta ?? ''}
          min={filtros.desde ?? undefined}
          alCambiar={(hasta) => cambiar({ hasta: hasta || null })}
        />
        <CampoSelect
          etiqueta={t.accion}
          valor={filtros.accion ?? ''}
          opciones={[
            { valor: '', etiqueta: t.todas },
            ...acciones.map((a) => ({ valor: a, etiqueta: nombreAccion(a) })),
          ]}
          alCambiar={(accion) => cambiar({ accion: accion || null })}
        />
        <div className="flex items-end">
          <Button
            variant="fantasma"
            disabled={!hayFiltros}
            onClick={() => setParams(new URLSearchParams())}
          >
            <FilterX aria-hidden className="size-4" />
            {panel.filtros.limpiar}
          </Button>
        </div>
      </section>

      {consulta.isError ? (
        <ErrorCarga error={consulta.error} alReintentar={() => void consulta.refetch()} />
      ) : null}

      {datos && datos.total === 0 ? (
        <EmptyState icon={<ScrollText aria-hidden className="size-8" />} title={t.vacio} />
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
                  {(['fecha', 'actor', 'accion', 'entidad', 'institucion', 'detalle'] as const).map(
                    (c) => (
                      <th key={c} scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">
                        {t.columnas[c]}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {datos.filas.map((fila) => (
                  <FilaRegistroAuditoria key={fila.id} fila={fila} />
                ))}
              </tbody>
            </table>
          </div>

          <nav
            aria-label={panel.registros.pagina(datos.pagina, paginas)}
            className="flex flex-wrap items-center justify-between gap-3 text-pequeno"
          >
            <p className="text-grafito-600 tabular-nums">{t.total(formatearNumero(datos.total))}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secundario"
                size="sm"
                disabled={filtros.pagina <= 1}
                onClick={() => cambiar({ pagina: filtros.pagina - 1 })}
              >
                <ChevronLeft aria-hidden className="size-4" />
                {panel.registros.anterior}
              </Button>
              <span className="text-grafito-600 tabular-nums">
                {panel.registros.pagina(datos.pagina, paginas)}
              </span>
              <Button
                variant="secundario"
                size="sm"
                disabled={filtros.pagina >= paginas}
                onClick={() => cambiar({ pagina: filtros.pagina + 1 })}
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
          {Array.from({ length: 8 }, (_, n) => (
            <Skeleton key={n} className="h-10" />
          ))}
        </div>
      ) : null}
    </PaginaPanel>
  );
}

function FilaRegistroAuditoria({ fila }: { fila: FilaAuditoria }) {
  const detalle = Object.entries(fila.detalle ?? {});
  const rol =
    fila.actorRol && fila.actorRol in roles ? roles[fila.actorRol as keyof typeof roles] : null;
  return (
    <tr className="border-t border-piedra-200 align-top hover:bg-piedra-50">
      <td className="px-3 py-2 whitespace-nowrap tabular-nums">
        {formatearFechaHora(fila.ocurridoEn)}
      </td>
      <th scope="row" className="px-3 py-2 text-left font-normal">
        <span className="font-semibold text-grafito-900">{fila.actor ?? t.sistema}</span>
        {rol ? <span className="block text-[0.8125rem] text-grafito-600">{rol}</span> : null}
      </th>
      <td className="px-3 py-2">{nombreAccion(fila.accion)}</td>
      <td className="px-3 py-2">
        {nombreEntidad(fila.entidad)}
        {fila.entidadId ? (
          <span className="font-mono block max-w-48 truncate text-[0.8125rem] text-grafito-600">
            {fila.entidadId}
          </span>
        ) : null}
      </td>
      <td className="px-3 py-2">{fila.institucion ?? t.sinInstitucion}</td>
      <td className="px-3 py-2">
        {detalle.length ? (
          <details>
            <summary className="min-h-11 cursor-pointer font-semibold text-pizarra-700">
              {t.verDetalle}
            </summary>
            <dl className="mt-1 flex max-w-sm flex-col gap-1">
              {detalle.map(([clave, valor]) => (
                <div key={clave} className="flex flex-col">
                  <dt className="font-mono text-[0.75rem] text-grafito-600">{clave}</dt>
                  <dd className="break-words text-grafito-900">{valorLegible(valor)}</dd>
                </div>
              ))}
            </dl>
          </details>
        ) : (
          '—'
        )}
      </td>
    </tr>
  );
}
