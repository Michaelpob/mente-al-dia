import { describe, expect, it } from 'vitest';
import { claveSesion, leerCuentaGuardada } from './sesion-guardada';

const sesion = (user_metadata: Record<string, unknown>) =>
  JSON.stringify({ access_token: 'x', user: { id: 'u-1', user_metadata } });

describe('sesión guardada', () => {
  it('usa la misma clave que supabase-js', () => {
    expect(claveSesion('https://lpcfrtlfiljgwxarpslf.supabase.co')).toBe(
      'sb-lpcfrtlfiljgwxarpslf-auth-token',
    );
    expect(claveSesion('http://127.0.0.1:54321')).toBe('sb-127-auth-token');
    expect(claveSesion(undefined)).toBeNull();
  });

  it('lee el nombre y el usuario de una cuenta pública', () => {
    expect(
      leerCuentaGuardada(sesion({ tipo: 'cuenta', nombre: 'Ana Pérez', usuario: 'ana' })),
    ).toEqual({ id: 'u-1', nombre: 'Ana Pérez', usuario: 'ana' });
  });

  it('no toma la sesión del equipo del panel ni datos dañados', () => {
    expect(leerCuentaGuardada(sesion({ nombre: 'Equipo' }))).toBeNull();
    expect(leerCuentaGuardada('{no es json')).toBeNull();
    expect(leerCuentaGuardada(null)).toBeNull();
  });
});
