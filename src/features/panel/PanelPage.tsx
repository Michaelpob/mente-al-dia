import { PlaceholderPage } from '@/components/layout/page';
import { textos } from '@/content/textos-interfaz';
import { BotonCerrarSesion } from './acceso/formularios';
import { useSesion } from './acceso/sesion-context';

const t = textos.accesoPanel;

/** Provisional: el tablero se construye en la Fase 8. Aquí ya solo entra una sesión con doble factor. */
export default function PanelPage() {
  const { estado, cerrarSesion } = useSesion();
  return (
    <>
      {estado.tipo === 'lista' ? (
        <div className="border-b border-piedra-200 bg-blanco">
          <div className="contenedor flex flex-wrap items-center justify-between gap-3 py-3">
            <p className="text-pequeno text-grafito-600">
              {t.sesionComo(estado.perfil.nombre, t.roles[estado.perfil.rol])}
            </p>
            <BotonCerrarSesion onClick={cerrarSesion} />
          </div>
        </div>
      ) : null}
      <PlaceholderPage pagina="panel" />
    </>
  );
}
