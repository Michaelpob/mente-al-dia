import { textos } from '@/content/textos-interfaz';

export interface NavItem {
  to: string;
  label: string;
}

/** Menú principal del sitio público. Las anclas son secciones de la página de inicio. */
export const mainNavItems: readonly NavItem[] = [
  { to: '/', label: textos.nav.inicio },
  { to: '/#como-funciona', label: textos.nav.comoFunciona },
  { to: '/#areas', label: textos.nav.areas },
  { to: '/#preguntas-frecuentes', label: textos.nav.preguntas },
];

export const footerLinks: readonly NavItem[] = [
  { to: '/privacidad', label: textos.pie.politica },
  { to: '/terminos', label: textos.pie.terminos },
  { to: '/accesibilidad', label: textos.pie.accesibilidad },
  { to: '/mapa-del-sitio', label: textos.pie.mapa },
];
