import { describe, expect, it } from 'vitest';
import { esGeneral, perfilDeFila, resolverEstado, type PerfilPanel } from './estado-sesion';

const perfil: PerfilPanel = {
  id: 'p1',
  nombre: 'Administración',
  rol: 'superadministrador',
  activo: true,
  institucion: null,
};
const colegio = { id: 'i1', nombre: 'Colegio 1', slug: 'colegio1', activa: true };
const institucional: PerfilPanel = {
  id: 'p2',
  nombre: 'Rectoría',
  rol: 'administrador_institucional',
  activo: true,
  institucion: colegio,
};
/** Sesión abierta con el correo y la contraseña (D-89). */
const base = { haySesion: true, perfil };

describe('resolverEstado', () => {
  it('sin sesión pide ingresar', () => {
    expect(resolverEstado({ ...base, haySesion: false })).toEqual({ tipo: 'sin_sesion' });
  });

  it('una cuenta sin perfil no entra', () => {
    expect(resolverEstado({ ...base, perfil: null })).toEqual({
      tipo: 'sin_acceso',
      motivo: 'sin_perfil',
    });
  });

  it('una cuenta desactivada no entra', () => {
    expect(resolverEstado({ ...base, perfil: { ...perfil, activo: false } })).toEqual({
      tipo: 'sin_acceso',
      motivo: 'inactivo',
    });
  });

  it('con el correo y la contraseña, el administrador general entra al panel (D-89)', () => {
    expect(resolverEstado(base)).toEqual({ tipo: 'lista', perfil });
  });

  it('el administrador de una institución activa entra (D-86)', () => {
    expect(resolverEstado({ ...base, perfil: institucional })).toEqual({
      tipo: 'lista',
      perfil: institucional,
    });
  });

  it('con su institución desactivada, el administrador institucional no entra', () => {
    for (const institucion of [{ ...colegio, activa: false }, null]) {
      expect(resolverEstado({ ...base, perfil: { ...institucional, institucion } })).toEqual({
        tipo: 'sin_acceso',
        motivo: 'institucion_inactiva',
      });
    }
  });

  it('los roles antiguos no entran: profesional y consulta (D-65, D-86)', () => {
    for (const rol of ['profesional', 'consulta'] as const) {
      expect(resolverEstado({ ...base, perfil: { ...perfil, rol } })).toEqual({
        tipo: 'sin_acceso',
        motivo: 'sin_permiso',
      });
    }
  });
});

describe('perfilDeFila', () => {
  it('arma la institución desde las columnas de mi_perfil', () => {
    expect(
      perfilDeFila({
        id: 'p2',
        nombre: 'Rectoría',
        rol: 'administrador_institucional',
        activo: true,
        institucion_id: 'i1',
        institucion_nombre: 'Colegio 1',
        institucion_slug: 'colegio1',
        institucion_activa: true,
      }),
    ).toEqual(institucional);
  });

  it('el general no tiene institución; sin fila no hay perfil', () => {
    expect(
      perfilDeFila({ id: 'p1', nombre: 'Administración', rol: 'superadministrador', activo: true }),
    ).toEqual(perfil);
    expect(perfilDeFila(null)).toBeNull();
  });

  it('solo el superadministrador es el administrador general', () => {
    expect(esGeneral(perfil)).toBe(true);
    expect(esGeneral(institucional)).toBe(false);
    expect(esGeneral(null)).toBe(false);
  });
});
