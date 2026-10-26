import { cn } from '@/lib/utils/cn';
import type { AreaId } from '@/types/dominio';
import { calcularSegmentos, CENTRO, RADIO_INTERIOR } from './geometria-rueda';
import { iconosAreas, tonoDimension } from './iconos-areas';

const SEGMENTOS = calcularSegmentos();

interface RuedaBienestarProps {
  /** Texto del centro cuando no hay un área activa. */
  centro: { titulo: string; detalle: string };
  /** Área destacada (puntero encima o elegida en la lista). */
  activa: AreaId | null;
  /** Áreas resaltadas; las demás se atenúan. null = ninguna atenuada. */
  resaltadas: readonly AreaId[] | null;
  onActivar: (id: AreaId | null) => void;
  onElegir: (id: AreaId) => void;
  className?: string;
}

/**
 * Rueda de bienestar sin niveles (inicio): cada dimensión con su tono.
 * Es un apoyo visual para el puntero; la misma información está en la lista de áreas,
 * que es la que usan el teclado y los lectores de pantalla. Por eso la rueda va oculta para
 * la tecnología de asistencia y sus sectores no reciben foco.
 */
export function RuedaBienestar({
  centro,
  activa,
  resaltadas,
  onActivar,
  onElegir,
  className,
}: RuedaBienestarProps) {
  const segmentoActivo = SEGMENTOS.find((s) => s.area.id === activa);
  return (
    <div aria-hidden className={cn('relative mx-auto w-full max-w-[26rem]', className)}>
      <svg
        viewBox="0 0 400 400"
        className="h-auto w-full overflow-visible"
        onPointerLeave={() => onActivar(null)}
      >
        <circle cx={CENTRO} cy={CENTRO} r={RADIO_INTERIOR - 10} fill="var(--blanco)" />
        {SEGMENTOS.map(({ area, dimension, d, icono }) => {
          const Icono = iconosAreas[area.icono];
          const esActiva = area.id === activa;
          const atenuada = resaltadas !== null && !resaltadas.includes(area.id);
          return (
            <g
              key={area.id}
              data-area={area.id}
              className={cn(
                'origin-[200px_200px] cursor-pointer transition-[scale,opacity] duration-(--duracion-base) ease-estandar [transform-box:view-box]',
                esActiva && 'movimiento:scale-104',
                atenuada && 'opacity-35',
              )}
              onPointerEnter={() => onActivar(area.id)}
              onClick={() => onElegir(area.id)}
            >
              <path
                d={d}
                fill={tonoDimension[dimension.id]}
                stroke={esActiva ? 'var(--grafito-900)' : 'var(--piedra-50)'}
                strokeWidth={esActiva ? 2.5 : 1.5}
                strokeLinejoin="round"
              />
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
          {segmentoActivo?.dimension.nombre ?? centro.detalle}
        </p>
      </div>
    </div>
  );
}
