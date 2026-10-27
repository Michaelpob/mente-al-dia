import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { PageMeta } from '@/components/layout/page';
import { Skeleton } from '@/components/ui/feedback';
import { panel } from '@/content/panel';
import { CampoFecha, CampoSelect, EncabezadoPanel, ErrorCarga, PaginaPanel } from '../compartido';
import { obtenerTablero } from '../datos/consultas';
import {
  PERIODOS,
  escribirFiltrosTablero,
  hoyEnColombia,
  leerFiltrosTablero,
  periodoDe,
  sumarDias,
} from '../datos/filtros';
import type { FiltrosTablero } from '../datos/tipos';
import { GraficaLugares, GraficaModulos, GraficaSemanas, MapaCalor } from './graficas';
import { Indicadores } from './indicadores';

const t = panel.tablero;
const f = panel.filtros;

/** /panel: indicadores y gráficas del periodo, con filtros de fecha, módulo y lugar en la dirección. */
export default function TableroPage() {
  const [params, setParams] = useSearchParams();
  const hoy = useMemo(() => hoyEnColombia(), []);
  const filtros = leerFiltrosTablero(params, hoy);
  const periodo = periodoDe(filtros, hoy);
  const [elegirFechas, setElegirFechas] = useState(false);
  const mostrarFechas = elegirFechas || periodo === 'personalizado';

  const consulta = useQuery({
    queryKey: ['panel', 'tablero', filtros],
    queryFn: () => obtenerTablero(filtros),
    placeholderData: keepPreviousData,
  });

  const cambiar = (nuevos: Partial<FiltrosTablero>) =>
    setParams(escribirFiltrosTablero({ ...filtros, ...nuevos }, hoy), { replace: true });

  const lugares = consulta.data?.opcionesLugar ?? [];
  const opcionesLugar = [
    { valor: '', etiqueta: f.todos },
    ...[...new Set(filtros.lugar ? [filtros.lugar, ...lugares] : lugares)].map((l) => ({
      valor: l,
      etiqueta: l,
    })),
  ];

  return (
    <PaginaPanel>
      <PageMeta title={t.titulo} indexable={false} />
      <EncabezadoPanel titulo={t.titulo} descripcion={t.descripcion} />

      <section
        aria-label={f.titulo}
        className="grid gap-4 rounded-xl border border-piedra-200 bg-blanco p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <CampoSelect
          etiqueta={f.periodo}
          valor={mostrarFechas ? 'personalizado' : String(periodo)}
          opciones={[
            ...PERIODOS.map((n) => ({ valor: String(n), etiqueta: f.periodos[n] })),
            { valor: 'personalizado', etiqueta: f.periodos.personalizado },
          ]}
          alCambiar={(valor) => {
            if (valor === 'personalizado') return setElegirFechas(true);
            setElegirFechas(false);
            cambiar({ desde: sumarDias(hoy, 1 - Number(valor)), hasta: hoy });
          }}
        />
        <CampoSelect
          etiqueta={f.modulo}
          valor={filtros.modulo ?? ''}
          opciones={[
            { valor: '', etiqueta: f.todos },
            { valor: 'adulto', etiqueta: panel.modulos.adulto },
            { valor: 'nino', etiqueta: panel.modulos.nino },
          ]}
          alCambiar={(valor) =>
            cambiar({ modulo: valor === 'adulto' || valor === 'nino' ? valor : null })
          }
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
              valor={filtros.desde}
              max={filtros.hasta}
              alCambiar={(desde) => desde && cambiar({ desde })}
            />
            <CampoFecha
              etiqueta={f.hasta}
              valor={filtros.hasta}
              min={filtros.desde}
              max={hoy}
              alCambiar={(hasta) => hasta && cambiar({ hasta })}
            />
          </div>
        ) : null}
      </section>

      {consulta.isError ? (
        <ErrorCarga error={consulta.error} alReintentar={() => void consulta.refetch()} />
      ) : null}

      {consulta.data ? (
        <div
          className={
            consulta.isPlaceholderData
              ? 'flex flex-col gap-6 opacity-60 transition-opacity'
              : 'flex flex-col gap-6'
          }
        >
          <Indicadores tablero={consulta.data} consultaPrioritarios="/panel/prioritarios" />
          <div className="grid gap-6 xl:grid-cols-2">
            <GraficaSemanas datos={consulta.data.porSemana} />
            <GraficaModulos datos={consulta.data.porModulo} />
          </div>
          <MapaCalor tablero={consulta.data} filtros={filtros} />
          <GraficaLugares datos={consulta.data.lugares} />
        </div>
      ) : consulta.isPending ? (
        <div aria-busy="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : null}
    </PaginaPanel>
  );
}
