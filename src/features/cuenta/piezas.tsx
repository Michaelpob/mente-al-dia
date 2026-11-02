import type { ReactNode } from 'react';
import { Callout } from '@/components/ui/feedback';

/** Tarjeta centrada de las páginas de cuenta: la misma del ingreso al panel, dentro del sitio. */
export function TarjetaCuenta({
  titulo,
  texto,
  children,
}: {
  titulo: string;
  texto?: string;
  children: ReactNode;
}) {
  return (
    <section className="contenedor seccion">
      <div className="mx-auto flex max-w-md flex-col gap-6 rounded-xl border border-piedra-200 bg-blanco p-6 shadow-2 sm:p-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-h2 break-words">{titulo}</h1>
          {texto ? <p className="text-grafito-600">{texto}</p> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Error del formulario: se anuncia al aparecer. */
export function AvisoError({ mensaje }: { mensaje: string | null }) {
  return (
    <div role="alert" aria-live="assertive">
      {mensaje ? <Callout variant="apoyo">{mensaje}</Callout> : null}
    </div>
  );
}
