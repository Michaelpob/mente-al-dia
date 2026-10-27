import { useQuery } from '@tanstack/react-query';
import { Clock, Inbox } from 'lucide-react';
import { Link } from 'react-router';
import { PageMeta } from '@/components/layout/page';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { panel } from '@/content/panel';
import { cn } from '@/lib/utils/cn';
import { EncabezadoPanel, ErrorCarga, PaginaPanel } from '../compartido';
import { obtenerPrioritarios } from '../datos/consultas';
import { formatearFecha } from '../datos/formato';

const t = panel.prioritarios;

/** Con una semana o más sin gestión, el caso se marca con más fuerza. */
const DIAS_ALERTA = 7;

/** /panel/prioritarios: bandeja de casos con prioridad pendientes, del más antiguo al más reciente. */
export default function PrioritariosPage() {
  const consulta = useQuery({ queryKey: ['panel', 'prioritarios'], queryFn: obtenerPrioritarios });

  return (
    <PaginaPanel>
      <PageMeta title={t.titulo} indexable={false} />
      <EncabezadoPanel titulo={t.titulo} descripcion={t.descripcion} />

      {consulta.isError ? (
        <ErrorCarga error={consulta.error} alReintentar={() => void consulta.refetch()} />
      ) : null}

      {consulta.data && consulta.data.length === 0 ? (
        <EmptyState
          icon={<Inbox aria-hidden className="size-8" />}
          title={t.vacioTitulo}
          description={t.vacioTexto}
        />
      ) : consulta.data ? (
        <div className="overflow-x-auto rounded-xl border border-piedra-200 bg-blanco">
          <table className="w-full min-w-[52rem] text-left text-pequeno">
            <caption className="sr-only">{t.titulo}</caption>
            <thead className="bg-piedra-50">
              <tr>
                {(
                  ['fecha', 'nombre', 'modulo', 'lugar', 'motivos', 'dias', 'asignado'] as const
                ).map((c) => (
                  <th key={c} scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">
                    {t.columnas[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {consulta.data.map((p) => (
                <tr key={p.id} className="border-t border-piedra-200 align-top hover:bg-piedra-50">
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                    {formatearFecha(p.creadoEn)}
                  </td>
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    <Link
                      to={`/panel/registros/${p.id}`}
                      className="font-semibold text-pizarra-700 underline-offset-4 hover:underline"
                    >
                      {p.nombre}
                    </Link>
                    <span className="font-mono block text-[0.8125rem] text-grafito-600">
                      {p.codigo}
                    </span>
                  </th>
                  <td className="px-3 py-2">{panel.modulos[p.modulo]}</td>
                  <td className="px-3 py-2">{p.lugar ?? panel.sinDato}</td>
                  <td className="px-3 py-2">
                    <ul className="flex flex-col gap-1">
                      {p.motivos.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 font-semibold whitespace-nowrap',
                        p.diasSinGestion >= DIAS_ALERTA
                          ? 'bg-nivel-atencion-fondo text-nivel-atencion'
                          : 'bg-piedra-100 text-grafito-900',
                      )}
                    >
                      <Clock aria-hidden className="size-3.5" />
                      {t.dias(p.diasSinGestion)}
                    </span>
                  </td>
                  <td className="px-3 py-2">{p.asignado ?? panel.sinAsignar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : consulta.isPending ? (
        <div
          aria-busy="true"
          className="flex flex-col gap-2 rounded-xl border border-piedra-200 bg-blanco p-4"
        >
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : null}
    </PaginaPanel>
  );
}
