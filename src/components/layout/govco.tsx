import { sitio } from '@/config/sitio';
import { textos } from '@/content/textos-interfaz';

/**
 * Espacios reservados para la barra superior y el pie GOV.CO.
 * Se activan en src/config/sitio.ts si la oficina TIC confirma que aplican
 * (lineamientos de MinTIC); entonces se reemplaza el marcador por el componente oficial.
 */
export function GovCoTopBar() {
  if (!sitio.govco.barraSuperior) return null;
  return (
    <div className="border-b border-piedra-200 bg-blanco">
      <p className="contenedor py-2 text-pequeno text-grafito-600">{textos.govco.barraSuperior}</p>
    </div>
  );
}

export function GovCoFooter() {
  if (!sitio.govco.pie) return null;
  return (
    <div className="border-t border-piedra-200 bg-blanco">
      <p className="contenedor py-4 text-pequeno text-grafito-600">{textos.govco.pie}</p>
    </div>
  );
}
