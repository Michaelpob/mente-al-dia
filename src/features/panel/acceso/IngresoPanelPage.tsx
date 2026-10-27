import { Navigate, useLocation } from 'react-router';
import { PageLoading, PageMeta } from '@/components/layout/page';
import { Callout } from '@/components/ui/feedback';
import { panel } from '@/content/panel';
import { textos } from '@/content/textos-interfaz';
import {
  FormularioIngreso,
  InscribirDobleFactor,
  SinAcceso,
  TarjetaAcceso,
  VerificarDobleFactor,
} from './formularios';
import { useSesion } from './sesion-context';

const t = textos.accesoPanel;

/** /panel/ingresar: contraseña y, siempre, verificación en dos pasos. */
export default function IngresoPanelPage() {
  const { estado } = useSesion();
  const desde = (useLocation().state as { desde?: string } | null)?.desde ?? '/panel';

  return (
    <>
      <PageMeta title={t.titulo} indexable={false} />
      {(() => {
        switch (estado.tipo) {
          case 'sin_configurar':
            return (
              <TarjetaAcceso titulo={t.titulo}>
                <Callout>{t.sinConfigurar}</Callout>
              </TarjetaAcceso>
            );
          case 'cargando':
            return <PageLoading />;
          case 'sin_sesion':
            // «Cerrar sesión» en un paso del ingreso también vuelve a la página principal (D-74).
            if (estado.cierre === 'manual') return <Navigate to="/" replace />;
            return (
              <>
                {estado.cierre === 'inactividad' ? (
                  <div className="contenedor pt-8">
                    <Callout className="mx-auto max-w-md">{panel.inactividad.cerrada}</Callout>
                  </div>
                ) : null}
                <FormularioIngreso />
              </>
            );
          case 'sin_acceso':
            return <SinAcceso motivo={estado.motivo} />;
          case 'inscribir_doble_factor':
            return <InscribirDobleFactor />;
          case 'verificar_doble_factor':
            return <VerificarDobleFactor factorId={estado.factorId} />;
          case 'lista':
            return <Navigate to={desde} replace />;
        }
      })()}
    </>
  );
}
