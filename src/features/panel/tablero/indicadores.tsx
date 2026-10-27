import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Card } from '@/components/ui/card';
import { panel } from '@/content/panel';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { colorToken } from '../colores';
import { variacion } from '../datos/filtros';
import { formatearNumero, formatearPorcentaje } from '../datos/formato';
import type { ResultadoGeneral, Tablero } from '../datos/tipos';

const t = panel.tablero;
const RESULTADOS: readonly ResultadoGeneral[] = [
  'favorable',
  'por_fortalecer',
  'desafios',
  'insuficiente',
];
const TOKEN_RESULTADO: Record<ResultadoGeneral, [string, string]> = {
  favorable: ['rueda-adecuado', '#86a992'],
  por_fortalecer: ['rueda-fortalecer', '#d8b76e'],
  desafios: ['rueda-atencion', '#cc8c78'],
  insuficiente: ['rueda-sin-dato', '#c9ced2'],
};

/** Cuenta hasta el valor una sola vez (o lo muestra directo si se pidió reducir el movimiento). */
function useConteo(valor: number): number {
  const reducido = useReducedMotion();
  const [mostrado, setMostrado] = useState(reducido ? valor : 0);
  useEffect(() => {
    if (reducido || valor === 0) {
      setMostrado(valor);
      return;
    }
    const inicio = performance.now();
    let cuadro = 0;
    const paso = (ahora: number) => {
      const avance = Math.min(1, (ahora - inicio) / 700);
      setMostrado(Math.round(valor * (1 - (1 - avance) ** 3)));
      if (avance < 1) cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [valor, reducido]);
  return mostrado;
}

function Indicador({
  titulo,
  valor,
  children,
}: {
  titulo: string;
  valor: number;
  children?: React.ReactNode;
}) {
  const mostrado = useConteo(valor);
  return (
    <Card className="flex min-w-0 flex-col gap-2 bg-blanco p-5">
      <h2 className="text-pequeno font-semibold text-grafito-600">{titulo}</h2>
      {/* El número real va para los lectores de pantalla; la animación es solo visual. */}
      <p className="font-titulo text-h1 leading-none text-grafito-900">
        <span aria-hidden>{formatearNumero(mostrado)}</span>
        <span className="sr-only">{formatearNumero(valor)}</span>
      </p>
      {children}
    </Card>
  );
}

export function Indicadores({
  tablero,
  consultaPrioritarios,
}: {
  tablero: Tablero;
  consultaPrioritarios: string;
}) {
  const cambio = variacion(tablero.aplicaciones, tablero.aplicacionesAnterior);
  const total = RESULTADOS.reduce((s, r) => s + (tablero.resultados[r] ?? 0), 0);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Indicador titulo={t.indicadores.aplicaciones} valor={tablero.aplicaciones}>
        <p className="text-pequeno text-grafito-600">
          {cambio === null ? t.sinAnterior : t.variacion(cambio)}
        </p>
      </Indicador>
      <Indicador titulo={t.indicadores.personas} valor={tablero.personas}>
        <p className="text-pequeno text-grafito-600">{t.personasNota}</p>
      </Indicador>
      <Indicador titulo={t.indicadores.prioritarios} valor={tablero.prioritariosPendientes}>
        <p className="text-pequeno text-grafito-600">{t.prioritariosNota}</p>
        <Link
          to={consultaPrioritarios}
          className="inline-flex items-center gap-1 text-pequeno font-semibold text-pizarra-700 underline-offset-4 hover:underline"
        >
          {t.verPrioritarios}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </Indicador>
      <Card className="flex min-w-0 flex-col gap-3 bg-blanco p-5">
        <h2 className="text-pequeno font-semibold text-grafito-600">{t.indicadores.resultado}</h2>
        {total === 0 ? (
          <p className="text-grafito-600">{panel.graficas.sinDatos}</p>
        ) : (
          <>
            <div aria-hidden className="flex h-3 overflow-hidden rounded-pill bg-piedra-100">
              {RESULTADOS.map((r) =>
                tablero.resultados[r] ? (
                  <span
                    key={r}
                    className="h-full border-r-2 border-blanco last:border-r-0"
                    style={{
                      width: `${((tablero.resultados[r] ?? 0) / total) * 100}%`,
                      background: colorToken(...TOKEN_RESULTADO[r]),
                    }}
                  />
                ) : null,
              )}
            </div>
            <ul className="flex flex-col gap-1 text-pequeno tabular-nums">
              {RESULTADOS.map((r) => (
                <li key={r} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-2.5 rounded-pill"
                      style={{ background: colorToken(...TOKEN_RESULTADO[r]) }}
                    />
                    {panel.resultados[r]}
                  </span>
                  <span className="font-semibold text-grafito-900">
                    {formatearPorcentaje((tablero.resultados[r] ?? 0) / total)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
