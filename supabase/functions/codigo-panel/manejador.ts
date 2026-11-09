/**
 * Código por correo del panel (D-89). Después de la contraseña, el panel pide un código de 6 dígitos
 * que llega al correo de la cuenta. Supabase Auth lo envía (con el correo propio, D-79) y lo
 * comprueba; aquí se decide quién puede pedirlo y, si acierta, se marca la sesión como verificada
 * en la base. Solo sirve para una sesión abierta con contraseña: tener el correo no basta para entrar.
 */
import { esquemaCodigo, problemas } from '../_compartido/esquemas.ts';
import { Http, leerPeticion } from '../_compartido/http.ts';

export interface SesionCodigo {
  usuario: string;
  /** El correo de la cuenta (Supabase Auth), adonde llega el código. */
  correo: string | null;
  /** session_id del token: la sesión que queda verificada. */
  sesion: string | null;
  /** Cómo se abrió la sesión (claim amr): «password», «otp», «recovery»… */
  metodos: readonly string[];
}

export interface PerfilCodigo {
  activo: boolean;
  rol: string;
  /** La institución del administrador institucional; null si no tiene (el general). */
  institucionActiva: boolean | null;
}

/** Supabase Auth no deja enviar o comprobar más códigos por ahora (límite de correos o de intentos). */
export class LimiteAuth extends Error {
  constructor() {
    super('Límite de Supabase Auth');
    this.name = 'LimiteAuth';
  }
}

export interface Dependencias {
  origenes: readonly string[];
  /** La sesión del token (firma verificada por Supabase Auth); null si el token no es válido. */
  sesionDeToken(token: string): Promise<SesionCodigo | null>;
  perfil(usuario: string): Promise<PerfilCodigo | null>;
  /** Pide a Supabase Auth que envíe un código al correo, sin crear cuentas. */
  enviarCodigo(correo: string): Promise<void>;
  /** true si el código es el último enviado y no venció (la sesión que crea Auth se cierra). */
  comprobarCodigo(correo: string, codigo: string): Promise<boolean>;
  intentosRestantes(usuario: string): Promise<number>;
  /** Registra un código equivocado y devuelve los intentos que quedan. */
  registrarFallo(usuario: string): Promise<number>;
  marcarVerificada(usuario: string, sesion: string): Promise<void>;
  registrarError(contexto: string, error: unknown): void;
}

/** «ad***@colegio.edu.co»: para decir adónde llegó el código sin mostrar todo el correo. */
export function enmascararCorreo(correo: string): string {
  const [usuario = '', dominio = ''] = correo.split('@');
  return `${usuario.slice(0, 2)}***@${dominio}`;
}

/** Solo el administrador general y el de una institución activa entran al panel (D-86). */
const tieneAcceso = (perfil: PerfilCodigo | null) =>
  !!perfil &&
  perfil.activo &&
  (perfil.rol === 'superadministrador' ||
    (perfil.rol === 'administrador_institucional' && perfil.institucionActiva === true));

export function crearManejador(deps: Dependencias) {
  return async function manejar(peticion: Request): Promise<Response> {
    const http = new Http(peticion, deps.origenes);
    const leida = await leerPeticion(peticion, http);
    if ('respuesta' in leida) return leida.respuesta;

    const token = peticion.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return http.error(401, 'sin_sesion', 'Ingresa con tu correo y tu contraseña.');

    const pedido = esquemaCodigo.safeParse(leida.cuerpo);
    if (!pedido.success) {
      return http.error(400, 'entrada_invalida', 'Revisa el código.', problemas(pedido.error));
    }

    try {
      const sesion = await deps.sesionDeToken(token);
      if (!sesion?.sesion || !sesion.correo) {
        return http.error(401, 'sin_sesion', 'Tu sesión no es válida. Vuelve a ingresar.');
      }
      if (!sesion.metodos.includes('password')) {
        return http.error(
          403,
          'requiere_contrasena',
          'Ingresa con tu correo y tu contraseña para recibir el código.',
        );
      }
      if (!tieneAcceso(await deps.perfil(sesion.usuario))) {
        return http.error(403, 'sin_permiso', 'Tu cuenta no tiene acceso al panel.');
      }

      if (pedido.data.accion === 'enviar') {
        try {
          await deps.enviarCodigo(sesion.correo);
        } catch (error) {
          if (error instanceof LimiteAuth) {
            return http.error(429, 'espera', 'Espera un minuto antes de pedir otro código.');
          }
          throw error;
        }
        return http.json({ enviado: true, correo: enmascararCorreo(sesion.correo) });
      }

      if ((await deps.intentosRestantes(sesion.usuario)) <= 0) {
        return http.error(
          429,
          'demasiados_intentos',
          'Escribiste varios códigos equivocados. Espera unos minutos y pide otro.',
        );
      }
      let correcto: boolean;
      try {
        correcto = await deps.comprobarCodigo(sesion.correo, pedido.data.codigo);
      } catch (error) {
        if (error instanceof LimiteAuth) {
          return http.error(
            429,
            'demasiados_intentos',
            'Hubo muchos intentos. Espera unos minutos y pide otro código.',
          );
        }
        throw error;
      }
      if (!correcto) {
        const restantes = await deps.registrarFallo(sesion.usuario);
        return http.error(422, 'codigo_invalido', 'El código no es correcto o ya venció.', {
          restantes,
        });
      }
      await deps.marcarVerificada(sesion.usuario, sesion.sesion);
      return http.json({ verificado: true });
    } catch (error) {
      deps.registrarError('codigo-panel', error);
      return http.error(500, 'error_interno', 'No pudimos completar el paso. Intenta de nuevo.');
    }
  };
}
