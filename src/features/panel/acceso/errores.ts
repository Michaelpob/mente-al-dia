import { textos } from '@/content/textos-interfaz';

const t = textos.accesoPanel.errores;

/** Un error de la Edge Function «codigo-panel» (D-89), con su código y los intentos que quedan. */
export class ErrorCodigo extends Error {
  constructor(
    readonly code: string,
    readonly restantes?: number,
  ) {
    super(code);
    this.name = 'ErrorCodigo';
  }
}

/** Mensaje amable para un error de Supabase Auth o del código, sin mostrar detalles técnicos. */
export function mensajeError(error: unknown): string {
  const codigo = (error as { code?: string } | null)?.code;
  switch (codigo) {
    case 'invalid_credentials':
      return t.credenciales;
    case 'codigo_invalido': {
      const restantes = (error as ErrorCodigo).restantes;
      return typeof restantes === 'number' ? t.codigoRestantes(restantes) : t.codigo;
    }
    case 'espera':
      return t.espera;
    case 'requiere_contrasena':
      return t.requiereContrasena;
    case 'sin_permiso':
      return t.sinPermiso;
    case 'sin_sesion':
      return t.sesionVencida;
    case 'weak_password':
      return t.contrasenaDebil;
    case 'same_password':
      return t.mismaContrasena;
    case 'demasiados_intentos':
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return t.demasiadosIntentos;
    default:
      return t.general;
  }
}
