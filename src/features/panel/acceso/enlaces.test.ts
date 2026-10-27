import { describe, expect, it } from 'vitest';
import { direccionDefinirContrasena, redirigirEnlaceDeAcceso } from './enlaces';

const SESION = '#access_token=abc&expires_in=3600&refresh_token=def&token_type=bearer';

describe('direccionDefinirContrasena', () => {
  it('incluye la carpeta del sitio publicado', () => {
    expect(direccionDefinirContrasena('https://michaelpob.github.io', '/mente-al-dia/')).toBe(
      'https://michaelpob.github.io/mente-al-dia/panel/definir-contrasena',
    );
  });

  it('sin carpeta, va a la raíz del dominio', () => {
    expect(direccionDefinirContrasena('http://localhost:5173', '/')).toBe(
      'http://localhost:5173/panel/definir-contrasena',
    );
  });
});

describe('redirigirEnlaceDeAcceso', () => {
  it('lleva una invitación que llegó al inicio a definir la contraseña, con su fragmento', () => {
    expect(
      redirigirEnlaceDeAcceso('/mente-al-dia/', `${SESION}&type=invite`, '/mente-al-dia/'),
    ).toBe(`/mente-al-dia/panel/definir-contrasena${SESION}&type=invite`);
  });

  it('hace lo mismo con la recuperación de contraseña y sin carpeta', () => {
    expect(redirigirEnlaceDeAcceso('/', `${SESION}&type=recovery`, '/')).toBe(
      `/panel/definir-contrasena${SESION}&type=recovery`,
    );
  });

  it('lleva un enlace vencido a la misma página, que explica qué hacer', () => {
    const vencido = '#error=access_denied&error_code=otp_expired&error_description=Expired';
    expect(redirigirEnlaceDeAcceso('/mente-al-dia/', vencido, '/mente-al-dia/')).toBe(
      `/mente-al-dia/panel/definir-contrasena${vencido}`,
    );
  });

  it('no se mueve si ya está en definir la contraseña', () => {
    for (const ruta of [
      '/mente-al-dia/panel/definir-contrasena',
      '/mente-al-dia/panel/definir-contrasena/',
    ]) {
      expect(redirigirEnlaceDeAcceso(ruta, `${SESION}&type=invite`, '/mente-al-dia/')).toBeNull();
    }
  });

  it('ignora los fragmentos que no son de acceso', () => {
    expect(redirigirEnlaceDeAcceso('/mente-al-dia/', '', '/mente-al-dia/')).toBeNull();
    expect(redirigirEnlaceDeAcceso('/mente-al-dia/', '#contenido', '/mente-al-dia/')).toBeNull();
    expect(
      redirigirEnlaceDeAcceso('/mente-al-dia/', `${SESION}&type=signup`, '/mente-al-dia/'),
    ).toBeNull();
  });
});
