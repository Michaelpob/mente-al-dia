import { cn } from '@/lib/utils/cn';

interface SegmentedProgressProps {
  /** Segmentos completos. */
  value: number;
  total?: number;
  label: string;
  /** Texto que anuncia el lector de pantalla, por ejemplo «Pregunta 7 de 20». */
  valueText: string;
  className?: string;
}

/** Barra de progreso segmentada (20 segmentos por defecto, uno por pregunta). */
export function SegmentedProgress({
  value,
  total = 20,
  label,
  valueText,
  className,
}: SegmentedProgressProps) {
  const safeValue = Math.min(Math.max(value, 0), total);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={safeValue}
      aria-valuetext={valueText}
      className={cn('flex w-full gap-1', className)}
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            'h-2 flex-1 rounded-pill transition-colors duration-(--duracion-base) ease-estandar',
            index < safeValue
              ? 'bg-pizarra-700'
              : 'bg-piedra-200 contraste-alto:bg-piedra-100 contraste-alto:outline contraste-alto:outline-1 contraste-alto:outline-piedra-200',
          )}
        />
      ))}
    </div>
  );
}
