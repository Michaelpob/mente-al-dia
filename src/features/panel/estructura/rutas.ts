/**
 * Secciones que solo abre el administrador general (D-86). El menú del administrador institucional
 * no las muestra y, si alguien escribe la dirección, el panel muestra un aviso en su lugar. La base
 * de datos, de todos modos, le respondería «sin permiso».
 */
export const RUTAS_SOLO_GENERAL = [
  '/panel/cuentas',
  '/panel/instituciones',
  '/panel/usuarios',
  '/panel/auditoria',
  '/panel/configuracion',
] as const;

export const esRutaSoloGeneral = (ruta: string): boolean =>
  RUTAS_SOLO_GENERAL.some((r) => ruta === r || ruta.startsWith(`${r}/`));
