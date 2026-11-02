import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useId, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { PageLoading, PageMeta } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { fieldControlClasses } from '@/components/ui/field-styles';
import { panel } from '@/content/panel';
import { ACTIVIDAD_CUESTIONARIO, esActividadResultado } from '@/features/cuenta/actividades';
import { cn } from '@/lib/utils/cn';
import { EncabezadoPanel, ErrorCarga, PaginaPanel } from '../compartido';
import { obtenerCuentas, obtenerResumenCuentas } from '../datos/consultas';
import { formatearFecha, formatearFechaHora, formatearNumero } from '../datos/formato';
import type { FilaCuenta, ResumenCuentas } from '../datos/tipos';
import { GraficaSemanas } from '../tablero/graficas';
import { Indicador } from '../tablero/indicadores';

const t = panel.cuentas;
const ti = t.indicadores;
const r = panel.registros;

function Resumen({ resumen }: { resumen: ResumenCuentas }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo={ti.total} valor={resumen.total}>
          <p className="text-pequeno text-grafito-600">{ti.nuevas(resumen.nuevas30)}</p>
        </Indicador>
        <Indicador titulo={ti.activas7} valor={resumen.activas7}>
          <p className="text-pequeno text-grafito-600">{ti.activas30(resumen.activas30)}</p>
          <p className="text-pequeno text-grafito-600">{ti.activasNota}</p>
        </Indicador>
        <Indicador titulo={ti.enCurso} valor={resumen.enCurso}>
          <p className="text-pequeno text-grafito-600">{ti.conProgreso(resumen.conProgreso)}</p>
        </Indicador>
        <Indicador titulo={ti.completados} valor={resumen.completados}>
          <p className="text-pequeno text-grafito-600">{ti.completadosNota}</p>
        </Indicador>
      </div>
      <GraficaSemanas
        textos={t.semanas}
        datos={resumen.porSemana.map((s) => ({ semana: s.semana, aplicaciones: s.cuentas }))}
      />
    </>
  );
}

/** Avance de la cuenta: el cuestionario en curso y los terminados (sin su contenido). */
function Progreso({ fila }: { fila: FilaCuenta }) {
  const enCurso = fila.actividades.find(
    (a) => a.actividad === ACTIVIDAD_CUESTIONARIO && !a.completado,
  );
  const terminados = fila.actividades.filter((a) => esActividadResultado(a.actividad)).length;
  if (!enCurso && !terminados) return <span className="text-grafito-600">{t.sinProgreso}</span>;
  return (
    <span className="flex flex-col gap-1">
      {enCurso ? <span>{t.enCurso(enCurso.avance)}</span> : null}
      {terminados ? <span>{t.terminados(terminados)}</span> : null}
    </span>
  );
}

/** /panel/cuentas (D-77): cuentas públicas registradas, su actividad y su progreso. */
export default function CuentasPage() {
  const [parametros, setParametros] = useSearchParams();
  const busqueda = parametros.get('q') ?? '';
  const pagina = Math.max(Number(parametros.get('pagina')) || 1, 1);
  const idBusqueda = useId();

  const resumen = useQuery({
    queryKey: ['panel', 'cuentas', 'resumen'],
    queryFn: obtenerResumenCuentas,
  });
  const lista = useQuery({
    queryKey: ['panel', 'cuentas', 'lista', busqueda, pagina],
    queryFn: () => obtenerCuentas(busqueda, pagina),
    placeholderData: keepPreviousData,
  });

  const irA = (cambios: { q?: string; pagina?: number }) => {
    const siguiente = new URLSearchParams(parametros);
    if (cambios.q !== undefined) {
      if (cambios.q) siguiente.set('q', cambios.q);
      else siguiente.delete('q');
    }
    const nuevaPagina = cambios.pagina ?? 1;
    if (nuevaPagina > 1) siguiente.set('pagina', String(nuevaPagina));
    else siguiente.delete('pagina');
    setParametros(siguiente);
  };

  const buscar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    irA({ q: String(new FormData(evento.currentTarget).get('q') ?? '').trim() });
  };

  const datos = lista.data;
  const paginas = datos ? Math.max(Math.ceil(datos.total / datos.tamano), 1) : 1;
  const desde = datos && datos.total ? (datos.pagina - 1) * datos.tamano + 1 : 0;
  const hasta = datos ? Math.min(datos.pagina * datos.tamano, datos.total) : 0;

  return (
    <PaginaPanel>
      <PageMeta title={t.titulo} indexable={false} />
      <EncabezadoPanel titulo={t.titulo} descripcion={t.descripcion} />

      {resumen.error ? (
        <ErrorCarga error={resumen.error} alReintentar={() => void resumen.refetch()} />
      ) : resumen.data ? (
        <Resumen resumen={resumen.data} />
      ) : (
        <PageLoading />
      )}

      <section aria-labelledby="cuentas-lista" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="cuentas-lista" className="text-h3">
            {t.lista}
          </h2>
          <form role="search" onSubmit={buscar} className="flex w-full gap-2 sm:w-auto">
            <label htmlFor={idBusqueda} className="sr-only">
              {t.buscar}
            </label>
            <input
              id={idBusqueda}
              key={busqueda}
              name="q"
              type="search"
              defaultValue={busqueda}
              placeholder={t.buscarPlaceholder}
              className={cn(fieldControlClasses, 'min-h-11 sm:w-72')}
            />
            <Button type="submit" size="sm" variant="secundario">
              <Search aria-hidden className="size-4" />
              <span className="sr-only sm:not-sr-only">{panel.busqueda.boton}</span>
            </Button>
          </form>
        </div>

        {lista.error ? (
          <ErrorCarga error={lista.error} alReintentar={() => void lista.refetch()} />
        ) : !datos ? (
          <PageLoading />
        ) : datos.filas.length === 0 ? (
          <p className="rounded-lg border border-piedra-200 bg-blanco p-6 text-grafito-600">
            {busqueda ? t.sinCoincidencias : t.vacio}
          </p>
        ) : (
          <>
            <div
              role="region"
              aria-labelledby="cuentas-lista"
              tabIndex={0}
              className="overflow-x-auto rounded-lg border border-piedra-200 bg-blanco"
            >
              <table className="w-full min-w-[44rem] text-left text-pequeno">
                <thead className="border-b border-piedra-200 bg-piedra-100">
                  <tr>
                    {[
                      t.columnas.nombre,
                      t.columnas.registro,
                      t.columnas.ultimoIngreso,
                      t.columnas.progreso,
                    ].map((columna) => (
                      <th key={columna} scope="col" className="px-4 py-3 font-semibold">
                        {columna}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {datos.filas.map((fila) => (
                    <tr
                      key={fila.id}
                      className="border-b border-piedra-200 align-top last:border-0"
                    >
                      <th scope="row" className="px-4 py-3 font-normal">
                        <span className="block font-semibold text-grafito-900">{fila.nombre}</span>
                        <span className="block text-grafito-600">@{fila.usuario}</span>
                        {fila.correo ? (
                          <span className="block text-grafito-600">{fila.correo}</span>
                        ) : null}
                      </th>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatearFecha(fila.creadoEn)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {fila.ultimoIngreso ? formatearFechaHora(fila.ultimoIngreso) : t.nunca}
                      </td>
                      <td className="px-4 py-3">
                        <Progreso fila={fila} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-pequeno text-grafito-600">
              <p aria-live="polite">
                {r.rango(
                  formatearNumero(desde),
                  formatearNumero(hasta),
                  formatearNumero(datos.total),
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secundario"
                  disabled={datos.pagina <= 1}
                  onClick={() => irA({ q: busqueda, pagina: datos.pagina - 1 })}
                >
                  {r.anterior}
                </Button>
                <span>{r.pagina(datos.pagina, paginas)}</span>
                <Button
                  size="sm"
                  variant="secundario"
                  disabled={datos.pagina >= paginas}
                  onClick={() => irA({ q: busqueda, pagina: datos.pagina + 1 })}
                >
                  {r.siguiente}
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </PaginaPanel>
  );
}
