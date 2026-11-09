/**
 * Invitación de cuentas del panel (Fase 4). Las cuentas no se registran solas: el
 * superadministrador (administrador general), con doble factor, invita por correo: a otro
 * administrador general o al administrador de una institución (D-86), que debe existir y estar activa.
 * La persona invitada define su contraseña y su doble factor al abrir el enlace.
 */
import { esquemaInvitacion, problemas, type Invitacion } from '../_compartido/esquemas.ts';
import { Http, leerPeticion } from '../_compartido/http.ts';

export interface PerfilSesion {
  id: string;
  rol: 'superadministrador' | 'administrador_institucional' | 'profesional' | 'consulta';
  activo: boolean;
  doble_factor: boolean;
}

export interface Dependencias {
  origenes: readonly string[];
  /** Perfil de quien llama según su token (public.mi_perfil); null si el token no es válido. */
  perfilDeSesion(token: string): Promise<PerfilSesion | null>;
  /** La institución (nombre y estado); null si no existe. */
  institucion(id: string): Promise<{ nombre: string; activa: boolean } | null>;
  /**
   * Envía la invitación de Supabase Auth, con el nombre y la institución para el correo. Devuelve
   * null si el correo ya tiene cuenta.
   */
  invitar(
    correo: string,
    datos: { nombre: string; institucion: string | null },
  ): Promise<{ id: string } | null>;
  /** Llama a public.crear_perfil_invitado (deja la auditoría a nombre de quien invita). */
  crearPerfil(actor: string, id: string, datos: Invitacion): Promise<void>;
  /** Deshace la invitación si no se pudo crear el perfil. */
  eliminarUsuario(id: string): Promise<void>;
  registrarError(mensaje: string, error: unknown): void;
}

export function crearManejador(deps: Dependencias) {
  return async function manejar(peticion: Request): Promise<Response> {
    const http = new Http(peticion, deps.origenes);
    const leida = await leerPeticion(peticion, http);
    if ('respuesta' in leida) return leida.respuesta;

    const token = peticion.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return http.error(401, 'sin_sesion', 'Ingresa al panel para invitar.');

    try {
      const perfil = await deps.perfilDeSesion(token);
      if (!perfil)
        return http.error(401, 'sin_sesion', 'Tu sesión no es válida. Vuelve a ingresar.');
      if (!perfil.activo || perfil.rol !== 'superadministrador' || !perfil.doble_factor) {
        return http.error(
          403,
          'sin_permiso',
          'Solo el superadministrador, con doble factor, invita cuentas.',
        );
      }

      const invitacion = esquemaInvitacion.safeParse(leida.cuerpo);
      if (!invitacion.success) {
        return http.error(
          400,
          'entrada_invalida',
          'Revisa los datos de la invitación.',
          problemas(invitacion.error),
        );
      }

      let institucion: string | null = null;
      if (invitacion.data.institucionId) {
        const encontrada = await deps.institucion(invitacion.data.institucionId);
        if (!encontrada?.activa) {
          return http.error(
            422,
            'institucion_invalida',
            'La institución no existe o no está activa.',
          );
        }
        institucion = encontrada.nombre;
      }

      const usuario = await deps.invitar(invitacion.data.correo, {
        nombre: invitacion.data.nombre,
        institucion,
      });
      if (!usuario) return http.error(409, 'conflicto', 'Ese correo ya tiene una cuenta.');

      try {
        await deps.crearPerfil(perfil.id, usuario.id, invitacion.data);
      } catch (error) {
        await deps.eliminarUsuario(usuario.id);
        throw error;
      }
      return http.json({ id: usuario.id }, 201);
    } catch (error) {
      deps.registrarError('invitar-usuario', error);
      return http.error(500, 'error_interno', 'No pudimos enviar la invitación. Intenta de nuevo.');
    }
  };
}
