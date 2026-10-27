import {
  ClipboardList,
  FileChartColumn,
  Flag,
  LayoutDashboard,
  ScrollText,
  Settings,
  Table2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from 'react-router';
import { Tooltip } from '@/components/ui/tooltip';
import { panel } from '@/content/panel';
import { cn } from '@/lib/utils/cn';

const t = panel.menu;

interface Seccion {
  to: string;
  etiqueta: string;
  Icono: LucideIcon;
  fin?: boolean;
  fase9?: boolean;
}

const SECCIONES: readonly Seccion[] = [
  { to: '/panel', etiqueta: t.tablero, Icono: LayoutDashboard, fin: true },
  { to: '/panel/registros', etiqueta: t.registros, Icono: Table2 },
  { to: '/panel/prioritarios', etiqueta: t.prioritarios, Icono: Flag },
  { to: '/panel/seguimiento', etiqueta: t.seguimiento, Icono: ClipboardList, fase9: true },
  { to: '/panel/reportes', etiqueta: t.reportes, Icono: FileChartColumn, fase9: true },
];

/** Solo superadministración (Fase 8): configuración, usuarios y auditoría. */
const ADMINISTRACION: readonly Seccion[] = [
  { to: '/panel/configuracion', etiqueta: t.configuracion, Icono: Settings, fase9: true },
  { to: '/panel/usuarios', etiqueta: t.usuarios, Icono: Users, fase9: true },
  { to: '/panel/auditoria', etiqueta: t.auditoria, Icono: ScrollText, fase9: true },
];

export function NavegacionPanel({
  contraido = false,
  superadministrador,
  prioritarios,
  alNavegar,
}: {
  contraido?: boolean;
  superadministrador: boolean;
  prioritarios?: number;
  alNavegar?: () => void;
}) {
  const enlace = (s: Seccion) => {
    const contador = s.to === '/panel/prioritarios' && prioritarios ? prioritarios : 0;
    const contenido = (
      <NavLink
        to={s.to}
        end={s.fin}
        onClick={alNavegar}
        className={({ isActive }) =>
          cn(
            'flex min-h-11 items-center gap-3 rounded-md px-3 text-cuerpo font-semibold text-grafito-600',
            'hover:bg-piedra-100 hover:text-grafito-900',
            isActive &&
              'bg-pizarra-100 text-pizarra-800 contraste-alto:outline-2 contraste-alto:outline-pizarra-700',
            contraido && 'justify-center px-0',
          )
        }
      >
        <s.Icono aria-hidden className="size-5 shrink-0" />
        <span className={cn('min-w-0 flex-1 truncate', contraido && 'sr-only')}>{s.etiqueta}</span>
        {s.fase9 && !contraido ? (
          <span className="rounded-pill bg-piedra-100 px-2 py-0.5 text-[0.75rem] font-semibold text-grafito-600">
            {t.fase9}
          </span>
        ) : null}
        {contador ? (
          <span
            className={cn(
              'rounded-pill bg-nivel-atencion-fondo px-2 py-0.5 text-[0.75rem] font-bold text-nivel-atencion',
              contraido && 'sr-only',
            )}
          >
            <span aria-hidden>{contador}</span>
            <span className="sr-only">{t.pendientes(contador)}</span>
          </span>
        ) : null}
      </NavLink>
    );
    return (
      <li key={s.to}>
        {contraido ? (
          <Tooltip content={s.etiqueta} side="right">
            {contenido}
          </Tooltip>
        ) : (
          contenido
        )}
      </li>
    );
  };

  return (
    <nav aria-label={t.etiqueta} className="flex flex-col gap-6 p-3">
      <ul className="flex flex-col gap-1">{SECCIONES.map(enlace)}</ul>
      {superadministrador ? (
        <div className="flex flex-col gap-1">
          <p
            className={cn(
              'px-3 text-[0.75rem] font-bold tracking-wide text-grafito-500 uppercase',
              contraido && 'sr-only',
            )}
          >
            {t.administracion}
          </p>
          <ul className="flex flex-col gap-1">{ADMINISTRACION.map(enlace)}</ul>
        </div>
      ) : null}
    </nav>
  );
}
