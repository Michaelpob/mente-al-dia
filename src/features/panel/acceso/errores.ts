import { textos } from '@/content/textos-interfaz';

const t = textos.accesoPanel.errores;

/** Mensaje amable para un error de Supabase Auth, sin mostrar detalles técnicos. */
export function mensajeError(error: unknown): string {
  const codigo = (error as { code?: string } | null)?.code;
  switch (codigo) {
    case 'invalid_credentials':
      return t.credenciales;
    case 'mfa_verification_failed':
    case 'mfa_challenge_expired':
      return t.codigo;
    case 'weak_password':
      return t.contrasenaDebil;
    case 'same_password':
      return t.mismaContrasena;
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return t.demasiadosIntentos;
    default:
      return t.general;
  }
}
