import { Accessibility, RotateCcw } from 'lucide-react';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { SwitchField } from '@/components/ui/switch';
import { textos } from '@/content/textos-interfaz';
import { useSystemReducedMotion } from '@/hooks/use-reduced-motion';
import { useAccessibility } from '@/lib/a11y/accessibility-context';

const t = textos.accesibilidad;

function AccessibilityControls() {
  const a11y = useAccessibility();
  const systemReducedMotion = useSystemReducedMotion();
  const sizeLabelId = useId();
  const { preferences } = a11y;

  return (
    <div className="flex flex-col gap-6">
      <div role="group" aria-labelledby={sizeLabelId} className="flex flex-col gap-3">
        <span id={sizeLabelId} className="font-semibold text-grafito-900">
          {t.tamanoTexto}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="secundario"
            size="icono"
            aria-label={t.reducirTexto}
            disabled={!a11y.canDecreaseText}
            onClick={a11y.decreaseText}
            className="font-titulo text-pequeno"
          >
            A-
          </Button>
          <Button
            variant="secundario"
            size="icono"
            aria-label={t.textoNormal}
            onClick={a11y.resetText}
            className="font-titulo text-cuerpo"
          >
            A
          </Button>
          <Button
            variant="secundario"
            size="icono"
            aria-label={t.aumentarTexto}
            disabled={!a11y.canIncreaseText}
            onClick={a11y.increaseText}
            className="font-titulo text-cuerpo-grande"
          >
            A+
          </Button>
        </div>
        <p aria-live="polite" className="text-pequeno text-grafito-600">
          {t.tamanoActual(Math.round(a11y.textScale * 100))}
        </p>
      </div>

      <SwitchField
        label={t.altoContraste}
        description={t.altoContrasteDescripcion}
        checked={preferences.highContrast}
        onCheckedChange={() => a11y.toggle('highContrast')}
      />
      <div className="flex flex-col gap-2">
        <SwitchField
          label={t.reducirMovimiento}
          description={t.reducirMovimientoDescripcion}
          checked={preferences.reducedMotion || systemReducedMotion}
          disabled={systemReducedMotion}
          onCheckedChange={() => a11y.toggle('reducedMotion')}
        />
        {systemReducedMotion ? (
          <p className="text-pequeno text-grafito-600">{t.movimientoDelSistema}</p>
        ) : null}
      </div>
      <SwitchField
        label={t.lecturaFacil}
        description={t.lecturaFacilDescripcion}
        checked={preferences.easyReading}
        onCheckedChange={() => a11y.toggle('easyReading')}
      />
      <SwitchField
        label={t.avanceAutomatico}
        description={t.avanceAutomaticoDescripcion}
        checked={preferences.autoAdvance}
        onCheckedChange={() => a11y.toggle('autoAdvance')}
      />

      <Button variant="fantasma" size="sm" onClick={a11y.resetAll} className="self-start">
        <RotateCcw aria-hidden />
        {t.restablecer}
      </Button>
    </div>
  );
}

/**
 * Botón con el ícono universal de accesibilidad: abre el panel de preferencias.
 * Entre 768 y 1279 px muestra también la palabra «Accesibilidad»; en móvil y con el menú
 * completo (1280 px o más) queda solo el ícono, por espacio.
 */
export function AccessibilityButton() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          variant="fantasma"
          size="sm"
          aria-label={t.titulo}
          className="size-11 p-0 md:w-auto md:px-3 xl:w-11 xl:px-0 md:texto-grande:w-11 md:texto-grande:px-0"
        >
          <Accessibility aria-hidden className="size-6!" />
          <span className="hidden md:inline xl:hidden md:texto-grande:hidden">{t.titulo}</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent title={t.titulo} description={t.descripcion}>
        <AccessibilityControls />
      </DrawerContent>
    </Drawer>
  );
}
