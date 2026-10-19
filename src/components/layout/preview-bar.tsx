import { Link } from 'react-router';
import { vistaPrevia } from '@/config/entorno';
import { textos } from '@/content/textos-interfaz';

/**
 * Barra solo de la vista previa: en el Artifact no hay barra de direcciones,
 * así que permite saltar a las páginas que se revisan en esta fase.
 */
export function PreviewBar() {
  if (!vistaPrevia) return null;
  const t = textos.vistaPrevia;
  return (
    <nav aria-label={t.etiqueta} className="bg-pizarra-800 text-blanco">
      <div className="contenedor flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 text-pequeno">
        <span className="font-semibold">{t.titulo}</span>
        <ul className="flex flex-wrap">
          {t.enlaces.map((enlace) => (
            <li key={enlace.to}>
              <Link
                to={enlace.to}
                className="inline-flex min-h-11 items-center rounded-sm px-2 text-blanco underline decoration-1 underline-offset-4 hover:decoration-2 focus-visible:outline-blanco"
              >
                {enlace.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
