import { useQuery } from '@tanstack/react-query';
import { Menu, PanelLeftClose, PanelLeftOpen, Search, ShieldCheck } from 'lucide-react';
import { Suspense, useCallback, useState, type FormEvent } from 'react';
import { Link, Outlet, useNavigate } from 'react-router';
import { MenteAlDiaIsotipo, MenteAlDiaLogo } from '@/components/brand/logos';
import { PageLoading } from '@/components/layout/page';
import { MAIN_CONTENT_ID } from '@/components/layout/skip-link';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { fieldControlClasses } from '@/components/ui/field-styles';
import { panel } from '@/content/panel';
import { cn } from '@/lib/utils/cn';
import { BotonCerrarSesion } from '../acceso/formularios';
import { useSesion } from '../acceso/sesion-context';
import { obtenerPrioritarios } from '../datos/consultas';
import { AvisoInactividad } from './AvisoInactividad';
import { useInactividad } from './inactividad';
import { NavegacionPanel } from './NavegacionPanel';

const CLAVE_MENU = 'mad.panel.menuContraido';

function leerMenuContraido(): boolean {
  try {
    return window.localStorage.getItem(CLAVE_MENU) === '1';
  } catch {
    return false;
  }
}

/**
 * Estructura del panel (Fase 8): menú lateral contraíble (en el teléfono, un panel deslizable),
 * barra superior con búsqueda y sesión, y el aviso fijo de que los resultados no son un diagnóstico.
 * Solo se monta con la sesión lista (RequierePanel).
 */
export default function PanelShell() {
  const { estado, cerrarSesion } = useSesion();
  const navigate = useNavigate();
  const [contraido, setContraido] = useState(leerMenuContraido);
  const [menuMovil, setMenuMovil] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const perfil = estado.tipo === 'lista' ? estado.perfil : null;

  const prioritarios = useQuery({
    queryKey: ['panel', 'prioritarios'],
    queryFn: obtenerPrioritarios,
  });

  // Por inactividad se va al ingreso, que explica el cierre y al volver a entrar regresa a esta
  // misma página (D-69); RequierePanel hace la redirección.
  const salirPorInactividad = useCallback(() => void cerrarSesion('inactividad'), [cerrarSesion]);
  const inactividad = useInactividad(salirPorInactividad);

  const alternarMenu = () => {
    setContraido((previo) => {
      try {
        window.localStorage.setItem(CLAVE_MENU, previo ? '0' : '1');
      } catch {
        // Sin almacenamiento, el menú vuelve a abrirse en la próxima visita.
      }
      return !previo;
    });
  };

  const buscar = (e: FormEvent) => {
    e.preventDefault();
    const q = busqueda.trim();
    navigate(q ? `/panel/registros?${new URLSearchParams({ q })}` : '/panel/registros');
  };

  const nav = (props: { contraido?: boolean; alNavegar?: () => void }) => (
    <NavegacionPanel
      superadministrador={perfil?.rol === 'superadministrador'}
      prioritarios={prioritarios.data?.length}
      {...props}
    />
  );

  return (
    <div className="flex min-h-dvh">
      <aside
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col overflow-y-auto border-r border-piedra-200 bg-blanco lg:flex print:hidden',
          contraido ? 'w-[4.5rem]' : 'w-72',
        )}
      >
        <div
          className={cn(
            'flex min-h-16 items-center border-b border-piedra-200',
            contraido ? 'justify-center' : 'px-5',
          )}
        >
          <Link to="/panel" aria-label="Mente al Día, tablero">
            {contraido ? <MenteAlDiaIsotipo className="size-8" /> : <MenteAlDiaLogo />}
          </Link>
        </div>
        {nav({ contraido })}
        <div className="mt-auto border-t border-piedra-200 p-3">
          <button
            type="button"
            onClick={alternarMenu}
            aria-expanded={!contraido}
            className={cn(
              'flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-pequeno font-semibold text-grafito-600 hover:bg-piedra-100 hover:text-grafito-900',
              contraido && 'justify-center px-0',
            )}
          >
            {contraido ? (
              <PanelLeftOpen aria-hidden className="size-5" />
            ) : (
              <PanelLeftClose aria-hidden className="size-5" />
            )}
            <span className={cn(contraido && 'sr-only')}>
              {contraido ? panel.menu.expandir : panel.menu.contraer}
            </span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 print:hidden">
          <header className="flex min-h-16 flex-wrap items-center gap-3 border-b border-piedra-200 bg-blanco px-4 py-2 sm:px-6">
            <Drawer open={menuMovil} onOpenChange={setMenuMovil}>
              <DrawerTrigger asChild>
                <Button variant="secundario" size="sm" className="lg:hidden">
                  <Menu aria-hidden className="size-5" />
                  {panel.menu.abrir}
                </Button>
              </DrawerTrigger>
              <DrawerContent side="izquierda" title={<MenteAlDiaLogo />}>
                {nav({ alNavegar: () => setMenuMovil(false) })}
              </DrawerContent>
            </Drawer>

            <form
              role="search"
              onSubmit={buscar}
              className="order-last flex w-full min-w-0 gap-2 sm:order-none sm:w-auto sm:max-w-md sm:flex-1"
            >
              <label htmlFor="busqueda-global" className="sr-only">
                {panel.busqueda.etiqueta}
              </label>
              <input
                id="busqueda-global"
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={panel.busqueda.placeholder}
                className={cn(fieldControlClasses, 'min-h-11')}
              />
              <Button type="submit" size="sm" variant="secundario">
                <Search aria-hidden className="size-4" />
                <span className="sr-only sm:not-sr-only">{panel.busqueda.boton}</span>
              </Button>
            </form>

            {perfil ? (
              <div className="ml-auto flex items-center gap-3">
                <p className="hidden text-right text-pequeno leading-tight md:block">
                  <span className="block font-semibold text-grafito-900">{perfil.nombre}</span>
                  <span className="text-grafito-600">{panel.sesion.roles[perfil.rol]}</span>
                </p>
                <BotonCerrarSesion onClick={cerrarSesion} />
              </div>
            ) : null}
          </header>
          <p className="flex items-center gap-2 border-b border-piedra-200 bg-arena-100 px-4 py-1.5 text-pequeno text-grafito-600 sm:px-6">
            <ShieldCheck aria-hidden className="size-4 shrink-0" />
            {panel.aviso}
          </p>
        </div>

        <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 outline-none">
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <AvisoInactividad
        abierto={inactividad.fase === 'aviso'}
        segundos={inactividad.segundos}
        alSeguir={inactividad.seguir}
        alSalir={() => void cerrarSesion()}
      />
    </div>
  );
}
