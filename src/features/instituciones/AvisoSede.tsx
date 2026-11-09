import { Building2, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { textos } from '@/content/textos-interfaz';
import { useSede } from './sede-context';

const t = textos.sede;

/**
 * Debajo del encabezado: con qué institución participa la persona (D-86), o que su enlace no
 * corresponde a una institución activa. Sin enlace de institución no muestra nada.
 */
export function AvisoSede() {
  const { estado, reintentar } = useSede();

  if (estado.tipo === 'valida') {
    return (
      <div className="border-b border-piedra-200 bg-piedra-50 print:hidden">
        <p className="contenedor flex items-center gap-2 py-2 text-pequeno text-grafito-600">
          <Building2 aria-hidden className="size-4 shrink-0 text-salvia-600" />
          <span>
            {t.participas} <strong className="text-grafito-900">{estado.sede.nombre}</strong>
          </span>
        </p>
      </div>
    );
  }

  if (estado.tipo === 'invalida' || estado.tipo === 'error') {
    return (
      <div
        role="status"
        className="border-b border-piedra-200 bg-nivel-fortalecer-fondo print:hidden"
      >
        <div className="contenedor flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-pequeno text-grafito-900">
          <CircleAlert aria-hidden className="size-4 shrink-0 text-nivel-fortalecer" />
          <span className="min-w-0 flex-1">
            {estado.tipo === 'invalida' ? t.invalida : t.error}
          </span>
          {estado.tipo === 'error' ? (
            <Button variant="enlace" size="sm" onClick={reintentar}>
              {t.reintentar}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return null;
}
