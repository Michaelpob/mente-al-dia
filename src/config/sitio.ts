/**
 * Datos institucionales del cliente.
 * Mientras la Alcaldía no los entregue se muestran los marcadores entre corchetes:
 * nunca se inventan nombres, cifras ni teléfonos.
 */
export interface SitioConfig {
  municipio: string;
  secretaria: string;
  correoContacto: string;
  telefonoContacto: string;
  dominio: string;
  /** Ruta del logo oficial dentro de /public (por ejemplo '/logo-alcaldia.svg'). null = marcador. */
  logoAlcaldia: string | null;
  /** Espacios para la barra superior y el pie GOV.CO, si la oficina TIC indica que aplican. */
  govco: {
    barraSuperior: boolean;
    pie: boolean;
  };
}

export const sitio: SitioConfig = {
  municipio: '[MUNICIPIO]',
  secretaria: '[SECRETARÍA RESPONSABLE]',
  correoContacto: '[CORREO DE CONTACTO]',
  telefonoContacto: '[TELÉFONO DE CONTACTO]',
  dominio: '[DOMINIO]',
  logoAlcaldia: null,
  govco: {
    barraSuperior: false,
    pie: false,
  },
};

/** true si el valor sigue siendo un marcador pendiente, como «[MUNICIPIO]». */
export function esMarcador(valor: string): boolean {
  return /^\[.*\]$/.test(valor.trim());
}
