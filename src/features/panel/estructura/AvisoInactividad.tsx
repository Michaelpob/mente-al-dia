import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { DialogOverlay } from '@/components/ui/dialog';
import { panel } from '@/content/panel';

const t = panel.inactividad;

/**
 * Aviso del último minuto antes de cerrar la sesión por inactividad (D-69). Es un diálogo de alerta:
 * no se cierra con un clic fuera, solo con una de las dos acciones (Escape cuenta como «Seguir»).
 */
export function AvisoInactividad({
  abierto,
  segundos,
  alSeguir,
  alSalir,
}: {
  abierto: boolean;
  segundos: number;
  alSeguir: () => void;
  alSalir: () => void;
}) {
  return (
    <DialogPrimitive.Root open={abierto} onOpenChange={(abrir) => (abrir ? null : alSeguir())}>
      <DialogPrimitive.Portal>
        <DialogOverlay />
        <DialogPrimitive.Content
          role="alertdialog"
          onPointerDownOutside={(e) => e.preventDefault()}
          className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-blanco p-6 shadow-3 sm:p-8 contraste-alto:border-2 contraste-alto:border-piedra-200"
        >
          <DialogPrimitive.Title className="font-titulo text-h3 text-pizarra-700">
            {t.titulo}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-3 text-grafito-600" aria-live="polite">
            {t.texto(segundos)}
          </DialogPrimitive.Description>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
            {/* «Seguir» va primero: el diálogo enfoca el primer botón al abrirse. */}
            <Button onClick={alSeguir}>{t.seguir}</Button>
            <Button variant="secundario" onClick={alSalir}>
              {t.salir}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
