import { Table2, ChartColumn, Monitor, Smartphone, Tablet, type LucideIcon } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { panel } from '@/content/panel';
import { areas } from '@/content/v1/areas';
import { TIPOS_DISPOSITIVO, type TipoDispositivo } from '@/features/visitas/dispositivo';
import type { Modulo, Nivel } from '@/types/dominio';
import { colorToken } from '../colores';
import { escribirFiltrosRegistros, REGISTROS_POR_DEFECTO } from '../datos/filtros';
import {
  formatearDia,
  formatearDiaConAno,
  formatearNumero,
  formatearPorcentaje,
} from '../datos/formato';
import type { FiltrosTablero, ResultadoGeneral, Tablero, Visitas } from '../datos/tipos';

const t = panel.tablero;
const RESULTADOS: readonly ResultadoGeneral[] = [
  'favorable',
  'por_fortalecer',
  'desafios',
  'insuficiente',
];
const NIVELES_MAPA: readonly Nivel[] = ['adecuado', 'por_fortalecer', 'requiere_atencion'];

/** Rellenos de nivel del sitio público (D-57): los mismos colores en el panel. */
function coloresNivel() {
  return {
    adecuado: colorToken('rueda-adecuado', '#1592b5'),
    por_fortalecer: colorToken('rueda-fortalecer', '#a67c0e'),
    requiere_atencion: colorToken('rueda-atencion', '#cf4a6a'),
    sin_dato: colorToken('rueda-sin-dato', '#646fa3'),
  } satisfies Record<Nivel, string>;
}
const NIVEL_DE_RESULTADO: Record<ResultadoGeneral, Nivel> = {
  favorable: 'adecuado',
  por_fortalecer: 'por_fortalecer',
  desafios: 'requiere_atencion',
  insuficiente: 'sin_dato',
};

function useTinta() {
  return {
    principal: colorToken('pizarra-700', '#b0a4f7'),
    secundaria: colorToken('grafito-600', '#b9c1e8'),
    rejilla: colorToken('piedra-200', '#2a3470'),
    superficie: colorToken('blanco', '#141b47'),
    acento: colorToken('salvia-600', '#5eead4'),
  };
}

/** Tarjeta de gráfica: cada una se puede ver también como tabla (no depende solo del color). */
export function TarjetaGrafica({
  titulo,
  descripcion,
  tabla,
  children,
  sinDatos = false,
  mensajeSinDatos = panel.graficas.sinDatos,
  conAlternativa = true,
}: {
  titulo: string;
  descripcion: string;
  tabla?: ReactNode;
  children: ReactNode;
  sinDatos?: boolean;
  mensajeSinDatos?: string;
  conAlternativa?: boolean;
}) {
  const [verTabla, setVerTabla] = useState(false);
  const idTitulo = useId();
  return (
    <Card
      role="region"
      aria-labelledby={idTitulo}
      className="flex min-w-0 flex-col gap-4 bg-blanco p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={idTitulo} className="text-h4 text-grafito-900">
            {titulo}
          </h2>
          <p className="text-pequeno text-grafito-600">{descripcion}</p>
        </div>
        {conAlternativa && !sinDatos ? (
          <button
            type="button"
            aria-pressed={verTabla}
            onClick={() => setVerTabla((v) => !v)}
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-pequeno font-semibold text-pizarra-700 hover:bg-piedra-100"
          >
            {verTabla ? (
              <ChartColumn aria-hidden className="size-4" />
            ) : (
              <Table2 aria-hidden className="size-4" />
            )}
            {verTabla ? panel.graficas.verGrafica : panel.graficas.verTabla}
          </button>
        ) : null}
      </div>
      {sinDatos ? (
        <p className="rounded-md bg-piedra-50 px-4 py-8 text-center text-grafito-600">
          {mensajeSinDatos}
        </p>
      ) : verTabla ? (
        <div
          role="region"
          aria-label={`${titulo} (tabla)`}
          tabIndex={0}
          className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-pizarra-700"
        >
          {tabla}
        </div>
      ) : (
        children
      )}
    </Card>
  );
}

function TablaSimple({
  encabezados,
  filas,
}: {
  encabezados: readonly string[];
  filas: readonly (readonly ReactNode[])[];
}) {
  return (
    <table className="w-full text-left text-pequeno tabular-nums">
      <thead>
        <tr className="border-b border-piedra-200">
          {encabezados.map((e, i) => (
            <th
              key={e}
              scope="col"
              className={i === 0 ? 'py-2 pr-4 font-semibold' : 'py-2 pr-4 text-right font-semibold'}
            >
              {e}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((fila, i) => (
          <tr key={i} className="border-b border-piedra-100 last:border-0">
            {fila.map((c, j) =>
              j === 0 ? (
                <th key={j} scope="row" className="py-2 pr-4 font-normal">
                  {c}
                </th>
              ) : (
                <td key={j} className="py-2 pr-4 text-right">
                  {c}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------------- semanas

/** Una cifra por semana. Por defecto, las aplicaciones; con «textos», otra serie (cuentas nuevas). */
export function GraficaSemanas({
  datos,
  textos = t.semanas,
}: {
  datos: Tablero['porSemana'];
  textos?: {
    titulo: string;
    descripcion: string;
    columnas: { semana: string; aplicaciones: string };
  };
}) {
  const tinta = useTinta();
  const total = datos.reduce((s, d) => s + d.aplicaciones, 0);
  return (
    <TarjetaGrafica
      titulo={textos.titulo}
      descripcion={textos.descripcion}
      sinDatos={total === 0}
      tabla={
        <TablaSimple
          encabezados={[textos.columnas.semana, textos.columnas.aplicaciones]}
          filas={datos.map((d) => [formatearDiaConAno(d.semana), formatearNumero(d.aplicaciones)])}
        />
      }
    >
      <div
        className="h-64"
        role="img"
        aria-label={`${textos.titulo}: ${formatearNumero(total)} en ${datos.length} semanas`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            accessibilityLayer={false}
            data={datos}
            margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
          >
            <CartesianGrid vertical={false} stroke={tinta.rejilla} />
            <XAxis
              dataKey="semana"
              tickFormatter={formatearDia}
              tick={{ fill: tinta.secundaria, fontSize: 13 }}
              stroke={tinta.rejilla}
              minTickGap={16}
            />
            <YAxis
              allowDecimals={false}
              width={36}
              tick={{ fill: tinta.secundaria, fontSize: 13 }}
              stroke={tinta.rejilla}
            />
            <Tooltip
              labelFormatter={(semana) =>
                `${textos.columnas.semana} ${formatearDiaConAno(String(semana))}`
              }
              formatter={(valor) => [formatearNumero(Number(valor)), textos.columnas.aplicaciones]}
            />
            <Line
              type="monotone"
              dataKey="aplicaciones"
              stroke={tinta.principal}
              strokeWidth={2}
              dot={{ r: 4, fill: tinta.principal, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </TarjetaGrafica>
  );
}

// ---------------------------------------------------------------------------------- módulos

export function GraficaModulos({ datos }: { datos: Tablero['porModulo'] }) {
  const tinta = useTinta();
  const colores = coloresNivel();
  const modulos = [...new Set(datos.map((d) => d.modulo))] as Modulo[];
  const filas = modulos.map((modulo) => {
    const fila: Record<string, number | string> = { modulo: panel.modulos[modulo], total: 0 };
    for (const r of RESULTADOS) fila[r] = 0;
    for (const d of datos.filter((x) => x.modulo === modulo)) {
      fila[d.resultado] = d.n;
      fila.total = Number(fila.total) + d.n;
    }
    return fila;
  });
  const pct = (fila: Record<string, number | string>, r: ResultadoGeneral) =>
    Number(fila.total) ? formatearPorcentaje(Number(fila[r]) / Number(fila.total)) : '—';

  return (
    <TarjetaGrafica
      titulo={t.modulos.titulo}
      descripcion={t.modulos.descripcion}
      sinDatos={filas.length === 0}
      tabla={
        <TablaSimple
          encabezados={[
            t.modulos.columnas.modulo,
            ...RESULTADOS.map((r) => panel.resultados[r]),
            t.modulos.columnas.total,
          ]}
          filas={filas.map((f) => [
            String(f.modulo),
            ...RESULTADOS.map((r) => `${formatearNumero(Number(f[r]))} (${pct(f, r)})`),
            formatearNumero(Number(f.total)),
          ])}
        />
      }
    >
      <div className="h-64" role="img" aria-label={t.modulos.titulo}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            accessibilityLayer={false}
            data={filas}
            stackOffset="expand"
            margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
            barCategoryGap="30%"
          >
            <CartesianGrid vertical={false} stroke={tinta.rejilla} />
            <XAxis
              dataKey="modulo"
              tick={{ fill: tinta.secundaria, fontSize: 13 }}
              stroke={tinta.rejilla}
            />
            <YAxis
              tickFormatter={(v: number) => formatearPorcentaje(v)}
              width={48}
              tick={{ fill: tinta.secundaria, fontSize: 13 }}
              stroke={tinta.rejilla}
            />
            <Tooltip
              formatter={(valor, nombre, item) => {
                const total = Number((item.payload as Record<string, number>).total);
                const n = Number(valor);
                return [
                  `${formatearNumero(n)} (${total ? formatearPorcentaje(n / total) : '—'})`,
                  String(nombre),
                ];
              }}
            />
            <Legend itemSorter={null} wrapperStyle={{ fontSize: 13, color: tinta.secundaria }} />
            {RESULTADOS.map((r) => (
              <Bar
                key={r}
                dataKey={r}
                name={panel.resultados[r]}
                stackId="resultado"
                fill={colores[NIVEL_DE_RESULTADO[r]]}
                stroke={tinta.superficie}
                strokeWidth={2}
                maxBarSize={72}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </TarjetaGrafica>
  );
}

// ---------------------------------------------------------------------------------- mapa de calor

export function MapaCalor({ tablero, filtros }: { tablero: Tablero; filtros: FiltrosTablero }) {
  const colores = coloresNivel();
  const total = tablero.aplicaciones;
  const conteo = new Map(tablero.mapaCalor.map((c) => [`${c.area}|${c.nivel}`, c.n]));
  const enlace = (area: string, nivel: Nivel) =>
    `/panel/registros?${escribirFiltrosRegistros({
      ...REGISTROS_POR_DEFECTO,
      desde: filtros.desde,
      hasta: filtros.hasta,
      modulo: filtros.modulo,
      lugar: filtros.lugar,
      area: area as (typeof areas)[number]['id'],
      nivel,
    })}`;

  return (
    <TarjetaGrafica
      titulo={t.mapaCalor.titulo}
      descripcion={t.mapaCalor.descripcion}
      sinDatos={total === 0}
      conAlternativa={false}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-separate border-spacing-1 text-pequeno tabular-nums">
          <thead>
            <tr>
              <th scope="col" className="px-2 py-1 text-left font-semibold">
                {t.mapaCalor.area}
              </th>
              {NIVELES_MAPA.map((n) => (
                <th key={n} scope="col" className="w-36 px-2 py-1 text-center font-semibold">
                  {panel.niveles[n]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...areas]
              .sort((a, b) => a.numero - b.numero)
              .map((area) => (
                <tr key={area.id}>
                  <th scope="row" className="px-2 py-1 text-left font-normal text-grafito-900">
                    {area.nombre}
                  </th>
                  {NIVELES_MAPA.map((nivel) => {
                    const n = conteo.get(`${area.id}|${nivel}`) ?? 0;
                    const fraccion = n / total;
                    const texto = formatearPorcentaje(fraccion);
                    return (
                      <td key={nivel} className="p-0">
                        <Link
                          to={enlace(area.id, nivel)}
                          aria-label={t.mapaCalor.celda(area.nombre, panel.niveles[nivel], texto)}
                          className="flex min-h-11 items-center justify-center rounded-sm font-semibold text-grafito-900 outline-offset-2 hover:outline-2 hover:outline-pizarra-700"
                          style={{
                            background: `color-mix(in srgb, ${colores[nivel]} ${Math.round(15 + fraccion * 85)}%, var(--blanco))`,
                          }}
                        >
                          {texto}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </TarjetaGrafica>
  );
}

// ---------------------------------------------------------------------------------- lugares

export function GraficaLugares({ datos }: { datos: Tablero['lugares'] }) {
  const tinta = useTinta();
  return (
    <TarjetaGrafica
      titulo={t.lugares.titulo}
      descripcion={t.lugares.descripcion}
      sinDatos={datos.length === 0}
      tabla={
        <TablaSimple
          encabezados={[t.lugares.columnas.lugar, t.lugares.columnas.aplicaciones]}
          filas={datos.map((d) => [d.lugar, formatearNumero(d.n)])}
        />
      }
    >
      <div style={{ height: 48 + datos.length * 40 }} role="img" aria-label={t.lugares.titulo}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            accessibilityLayer={false}
            data={datos}
            layout="vertical"
            margin={{ top: 4, right: 40, bottom: 4, left: 8 }}
            barCategoryGap="25%"
          >
            <CartesianGrid horizontal={false} stroke={tinta.rejilla} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fill: tinta.secundaria, fontSize: 13 }}
              stroke={tinta.rejilla}
            />
            <YAxis
              type="category"
              dataKey="lugar"
              width={128}
              tick={{ fill: tinta.secundaria, fontSize: 13 }}
              stroke={tinta.rejilla}
            />
            <Tooltip
              formatter={(valor) => [
                formatearNumero(Number(valor)),
                t.lugares.columnas.aplicaciones,
              ]}
            />
            <Bar dataKey="n" fill={tinta.acento} radius={[0, 4, 4, 0]} maxBarSize={28}>
              <LabelList dataKey="n" position="right" fill={tinta.secundaria} fontSize={13} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </TarjetaGrafica>
  );
}

// ---------------------------------------------------------------------------------- dispositivos

const ICONO_DISPOSITIVO: Record<TipoDispositivo, LucideIcon> = {
  movil: Smartphone,
  tableta: Tablet,
  escritorio: Monitor,
};

/** Colores de las dimensiones (D-76): ya tienen su versión de alto contraste y de impresión. */
function coloresDispositivo() {
  return {
    movil: colorToken('dimension-cuerpo', '#13928a'),
    tableta: colorToken('dimension-afrontamiento', '#2e6cd3'),
    escritorio: colorToken('dimension-vinculos', '#c9653f'),
  } satisfies Record<TipoDispositivo, string>;
}

/** Visitas al sitio del periodo (D-80): el total en el centro y cada tipo de pantalla. */
export function GraficaDispositivos({ datos }: { datos: Visitas }) {
  const tinta = useTinta();
  const colores = coloresDispositivo();
  const d = t.dispositivos;
  const total = datos.total;
  const filas = TIPOS_DISPOSITIVO.map((tipo) => ({
    tipo,
    nombre: d.tipos[tipo],
    n: datos.porDispositivo[tipo] ?? 0,
    fill: colores[tipo],
  }));
  const pct = (n: number) => formatearPorcentaje(total ? n / total : 0);
  const detalle = (n: number) => d.detalle(formatearNumero(n), d.visitas(n), pct(n));
  const resumen = d.resumen(
    `${formatearNumero(total)} ${d.visitas(total)}`,
    filas.map((f) => `${f.nombre}, ${detalle(f.n)}`).join('; '),
  );

  return (
    <TarjetaGrafica
      titulo={d.titulo}
      descripcion={d.descripcion}
      sinDatos={total === 0}
      mensajeSinDatos={d.sinDatos}
      tabla={
        <TablaSimple
          encabezados={[d.columnas.dispositivo, d.columnas.visitas, d.columnas.porcentaje]}
          filas={[
            ...filas.map((f) => [f.nombre, formatearNumero(f.n), pct(f.n)]),
            [d.total, formatearNumero(total), formatearPorcentaje(1)],
          ]}
        />
      }
    >
      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div
          className="relative mx-auto aspect-square w-full max-w-72"
          role="img"
          aria-label={`${d.titulo}: ${resumen}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart accessibilityLayer={false}>
              <Pie
                data={filas.filter((f) => f.n > 0)}
                dataKey="n"
                nameKey="nombre"
                innerRadius="62%"
                outerRadius="94%"
                startAngle={90}
                endAngle={-270}
                stroke={tinta.superficie}
                strokeWidth={3}
              />
              <Tooltip
                separator=": "
                formatter={(valor, nombre) => [detalle(Number(valor)), String(nombre)]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          >
            <span className="text-h2 font-bold text-grafito-900 tabular-nums">
              {formatearNumero(total)}
            </span>
            <span className="text-pequeno text-grafito-600">{d.visitas(total)}</span>
          </div>
        </div>
        <ul className="flex min-w-0 flex-col gap-3">
          {filas.map((f) => {
            const Icono = ICONO_DISPOSITIVO[f.tipo];
            return (
              <li
                key={f.tipo}
                className="flex items-center gap-3 rounded-lg border border-piedra-200 px-4 py-3"
              >
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: f.fill }}
                />
                <Icono aria-hidden className="size-5 shrink-0 text-grafito-600" />
                <span className="min-w-0 flex-1 font-semibold text-grafito-900">{f.nombre}</span>
                <span className="font-semibold text-grafito-900 tabular-nums">
                  {formatearNumero(f.n)}
                </span>
                <span className="w-12 shrink-0 text-right text-grafito-600 tabular-nums">
                  {pct(f.n)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="text-pequeno text-grafito-600">{d.nota}</p>
    </TarjetaGrafica>
  );
}
