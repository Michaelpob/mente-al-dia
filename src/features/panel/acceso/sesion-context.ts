import { createContext, useContext } from 'react';
import type { CierreSesion, EstadoSesion } from './estado-sesion';

export interface SesionContextValue {
  estado: EstadoSesion;
  ingresar: (correo: string, contrasena: string) => Promise<void>;
  enviarRecuperacion: (correo: string) => Promise<void>;
  /** Guarda la contraseña y entra con ella; después sigue el código del correo. */
  definirContrasena: (contrasena: string) => Promise<void>;
  /** Pide que llegue un código al correo de la cuenta (D-89). Devuelve el correo enmascarado. */
  enviarCodigo: () => Promise<string>;
  /** Comprueba el código del correo; si es correcto, la sesión queda lista para el panel. */
  verificarCodigo: (codigo: string) => Promise<void>;
  /** Por defecto es un cierre manual: el panel vuelve a la página principal (D-74). */
  cerrarSesion: (cierre?: CierreSesion) => Promise<void>;
}

export const SesionContext = createContext<SesionContextValue | null>(null);

export function useSesion(): SesionContextValue {
  const value = useContext(SesionContext);
  if (!value) throw new Error('useSesion debe usarse dentro de <SesionProvider>.');
  return value;
}
