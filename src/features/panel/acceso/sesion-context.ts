import { createContext, useContext } from 'react';
import type { CierreSesion, EstadoSesion } from './estado-sesion';

export interface InscripcionDobleFactor {
  factorId: string;
  /** Imagen del código QR (SVG en data URL) que entrega Supabase. */
  qr: string;
  secreto: string;
}

export interface SesionContextValue {
  estado: EstadoSesion;
  ingresar: (correo: string, contrasena: string) => Promise<void>;
  enviarRecuperacion: (correo: string) => Promise<void>;
  definirContrasena: (contrasena: string) => Promise<void>;
  iniciarInscripcion: () => Promise<InscripcionDobleFactor>;
  verificarCodigo: (factorId: string, codigo: string) => Promise<void>;
  /** Por defecto es un cierre manual: el panel vuelve a la página principal (D-74). */
  cerrarSesion: (cierre?: CierreSesion) => Promise<void>;
}

export const SesionContext = createContext<SesionContextValue | null>(null);

export function useSesion(): SesionContextValue {
  const value = useContext(SesionContext);
  if (!value) throw new Error('useSesion debe usarse dentro de <SesionProvider>.');
  return value;
}
