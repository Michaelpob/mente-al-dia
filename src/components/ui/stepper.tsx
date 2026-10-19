import { Check } from 'lucide-react';
import { textos } from '@/content/textos-interfaz';
import { cn } from '@/lib/utils/cn';

interface StepperProps {
  steps: readonly string[];
  /** Índice del paso actual (desde 0). */
  current: number;
  label: string;
  className?: string;
}

/** Asistente por pasos. En móvil solo se muestra el nombre del paso actual. */
export function Stepper({ steps, current, label, className }: StepperProps) {
  return (
    <nav aria-label={label} className={className}>
      <ol className="flex items-start">
        {steps.map((step, index) => {
          const state = index < current ? 'completo' : index === current ? 'actual' : 'pendiente';
          return (
            <li
              key={step}
              aria-current={state === 'actual' ? 'step' : undefined}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
            >
              <span className="flex w-full items-center">
                <span
                  aria-hidden
                  className={cn(
                    'h-0.5 flex-1',
                    index === 0
                      ? 'invisible'
                      : index <= current
                        ? 'bg-pizarra-700'
                        : 'bg-piedra-300',
                  )}
                />
                <span
                  aria-hidden
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-pill border-2 text-pequeno font-semibold',
                    'transition-[background-color,border-color,color] duration-(--duracion-base) ease-estandar',
                    state === 'completo' && 'border-pizarra-700 bg-pizarra-700 text-blanco',
                    state === 'actual' && 'border-pizarra-700 bg-blanco text-pizarra-700',
                    state === 'pendiente' && 'border-borde-campo bg-blanco text-grafito-600',
                  )}
                >
                  {state === 'completo' ? <Check className="size-4" strokeWidth={3} /> : index + 1}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'h-0.5 flex-1',
                    index === steps.length - 1
                      ? 'invisible'
                      : index < current
                        ? 'bg-pizarra-700'
                        : 'bg-piedra-300',
                  )}
                />
              </span>
              <span
                className={cn(
                  'px-1 text-pequeno',
                  state === 'actual'
                    ? 'font-semibold text-pizarra-700'
                    : 'text-grafito-600 max-sm:sr-only',
                )}
              >
                {step}
                <span className="sr-only">
                  {' '}
                  {textos.stepper[state === 'completo' ? 'completado' : state]}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
