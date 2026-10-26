import { Link, useNavigate } from 'react-router';
import { PageLoading, PageMeta } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/feedback';
import { textos } from '@/content/textos-interfaz';
import {
  FormularioDefinirContrasena,
  SinAcceso,
  TarjetaAcceso,
  VerificarDobleFactor,
} from './formularios';
import { useSesion } from './sesion-context';

const t = textos.accesoPanel;

/**
 * /panel/definir-contrasena: destino de los enlaces de invitación y de recuperación.
 * El enlace abre una sesión; si la cuenta ya tiene doble factor, se pide antes de cambiar la contraseña.
 */
export default function DefinirContrasenaPage() {
  const { estado } = useSesion();
  const navigate = useNavigate();

  return (
    <>
      <PageMeta title={t.definirTitulo} indexable={false} />
      {(() => {
        switch (estado.tipo) {
          case 'cargando':
            return <PageLoading />;
          case 'sin_configurar':
          case 'sin_sesion':
            return (
              <TarjetaAcceso titulo={t.definirTitulo}>
                <Callout variant="apoyo">{t.enlaceVencido}</Callout>
                <Button asChild variant="secundario" className="self-start">
                  <Link to="/panel/ingresar">{t.volverIngreso}</Link>
                </Button>
              </TarjetaAcceso>
            );
          case 'sin_acceso':
            return <SinAcceso motivo={estado.motivo} />;
          case 'verificar_doble_factor':
            return <VerificarDobleFactor factorId={estado.factorId} />;
          case 'inscribir_doble_factor':
          case 'lista':
            return (
              <FormularioDefinirContrasena
                alGuardar={() => navigate('/panel', { replace: true })}
              />
            );
        }
      })()}
    </>
  );
}
