import { useId } from 'react';
import { textos } from '@/content/textos-interfaz';
import { cn } from '@/lib/utils/cn';
import type { AreaId, Nivel } from '@/types/dominio';
import { calcularSegmentos, CENTRO, RADIO_INTERIOR } from './geometria-rueda';
import { iconosAreas } from './iconos-areas';

const SEGMENTOS = calcularSegmentos();

/** Color de cada nivel en la rueda (tokens --rueda-*). */
const colorNivel: Record<Nivel, string> = {
  adecuado: 'var(--rueda-adecuado)',
  por_fortalecer: 'var(--rueda-fortalecer)',
  requiere_atencion: 'var(--rueda-atencion)',
  sin_dato: 'var(--rueda-sin-dato)',
};

/** Patrón sobre el color, para que el nivel no dependa solo del color. */
const patronNivel: Record<Nivel, 'rayas' | 'puntos' | 'cuadros' | null> = {
  adecuado: null,
  por_fortalecer: 'rayas',
  requiere_atencion: 'puntos',
  sin_dato: 'cuadros',
};

/** Definiciones SVG de los patrones; los ids llevan un prefijo único por rueda o leyenda. */
function PatronesNivel({ prefijo }: { prefijo: string }) {
  return (
    <defs>
      <pattern
        id={`${prefijo}-rayas`}
        width="7"
        height="7"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <rect width="3" height="7" fill="var(--blanco)" fillOpacity="0.45" />
      </pattern>
      <pattern id={`${prefijo}-puntos`} width="7" height="7" patternUnits="userSpaceOnUse">
        <circle cx="3.5" cy="3.5" r="1.6" fill="var(--blanco)" fillOpacity="0.55" />
      </pattern>
      <pattern id={`${prefijo}-cuadros`} width="8" height="8" patternUnits="userSpaceOnUse">
        <path d="M0 4H8M4 0V8" stroke="var(--blanco)" strokeOpacity="0.6" strokeWidth="1.2" />
      </pattern>
    </defs>
  );
}

interface RuedaNivelesProps {
  niveles: Partial<Record<AreaId, Nivel>>;
  centro: { titulo: string; detalle: string };
  /** Área destacada (puntero encima). */
  activa: AreaId | null;
  onActivar: (id: AreaId | null) => void;
  onElegir: (id: AreaId) => void;
  className?: string;
}

/**
 * Rueda de bienestar con el nivel de cada área (resultados): color + patrón + ícono.
 * Como la del inicio (D-30), es un apoyo para el puntero: la misma información está en las
 * tarjetas por área, que son la vía para el teclado y los lectores de pantalla.
 */
export function RuedaNiveles({
  niveles,
  centro,
  activa,
  onActivar,
  onElegir,
  className,
}: RuedaNivelesProps) {
  const prefijo = `rueda-${useId().replace(/:/g, '')}`;
  const segmentoActivo = SEGMENTOS.find((s) => s.area.id === activa);
  const nivelActivo = segmentoActivo ? (niveles[segmentoActivo.area.id] ?? 'sin_dato') : null;

  return (
    <div aria-hidden className={cn('relative mx-auto w-full max-w-[26rem]', className)}>
      <svg
        viewBox="0 0 400 400"
        className="h-auto w-full overflow-visible"
        onPointerLeave={() => onActivar(null)}
      >
        <PatronesNivel prefijo={prefijo} />
        <circle cx={CENTRO} cy={CENTRO} r={RADIO_INTERIOR - 10} fill="var(--blanco)" />
        {SEGMENTOS.map(({ area, d, icono }) => {
          const nivel = niveles[area.id] ?? 'sin_dato';
          const patron = patronNivel[nivel];
          const Icono = iconosAreas[area.icono];
          const esActiva = area.id === activa;
          return (
            <g
              key={area.id}
              data-area={area.id}
              data-nivel={nivel}
              className={cn(
                'origin-[200px_200px] cursor-pointer transition-[scale] duration-(--duracion-base) ease-estandar [transform-box:view-box]',
                esActiva && 'movimiento:scale-104',
              )}
              onPointerEnter={() => onActivar(area.id)}
              onClick={() => onElegir(area.id)}
            >
              <path
                d={d}
                fill={colorNivel[nivel]}
                stroke={esActiva ? 'var(--grafito-900)' : 'var(--piedra-50)'}
                strokeWidth={esActiva ? 2.5 : 1.5}
                strokeLinejoin="round"
              />
              {patron ? (
                <path d={d} fill={`url(#${prefijo}-${patron})`} pointerEvents="none" />
              ) : null}
              {Icono ? (
                <Icono
                  x={icono.x - 9}
                  y={icono.y - 9}
                  width={18}
                  height={18}
                  strokeWidth={2.25}
                  className="pointer-events-none text-grafito-900 opacity-80"
                />
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-[28%] flex flex-col items-center justify-center gap-1 text-center">
        <p className="font-titulo text-[clamp(1rem,3.6vw,1.375rem)] leading-tight font-extrabold text-pizarra-700">
          {segmentoActivo?.area.nombre ?? centro.titulo}
        </p>
        <p className="text-pequeno text-grafito-600">
          {nivelActivo ? textos.niveles[nivelActivo] : centro.detalle}
        </p>
      </div>
    </div>
  );
}

/** Leyenda de la rueda: muestra de color y patrón con el nombre de cada nivel. */
export function LeyendaNiveles({ etiqueta, className }: { etiqueta: string; className?: string }) {
  const prefijo = `leyenda-${useId().replace(/:/g, '')}`;
  return (
    <ul aria-label={etiqueta} className={cn('flex flex-wrap gap-x-5 gap-y-2', className)}>
      {(Object.keys(colorNivel) as Nivel[]).map((nivel) => {
        const patron = patronNivel[nivel];
        return (
          <li key={nivel} className="inline-flex items-center gap-2 text-pequeno text-grafito-900">
            <svg viewBox="0 0 16 16" aria-hidden className="size-4 shrink-0">
              <PatronesNivel prefijo={`${prefijo}-${nivel}`} />
              <rect width="16" height="16" rx="4" fill={colorNivel[nivel]} />
              {patron ? (
                <rect width="16" height="16" rx="4" fill={`url(#${prefijo}-${nivel}-${patron})`} />
              ) : null}
            </svg>
            {textos.niveles[nivel]}
          </li>
        );
      })}
    </ul>
  );
}
