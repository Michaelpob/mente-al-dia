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
/** Contraseña correcta, todavía sin el código del correo. */
const base = { haySesion: true, verificada: false, perfil };

describe('resolverEstado', () => {
  it('sin sesión pide ingresar', () => {
    expect(resolverEstado({ ...base, haySesion: false })).toEqual({ tipo: 'sin_sesion' });
  });

  it('una cuenta sin perfil no llega a pedir el código', () => {
    expect(resolverEstado({ ...base, perfil: null })).toEqual({
      tipo: 'sin_acceso',
      motivo: 'sin_perfil',
    });
  });

  it('una cuenta desactivada no entra aunque haya pasado el código', () => {
    expect(
      resolverEstado({ ...base, verificada: true, perfil: { ...perfil, activo: false } }),
    ).toEqual({ tipo: 'sin_acceso', motivo: 'inactivo' });
  });

  it('después de la contraseña pide el código que llega al correo (D-89)', () => {
    expect(resolverEstado(base)).toEqual({ tipo: 'verificar_codigo' });
    expect(resolverEstado({ ...base, perfil: institucional })).toEqual({
      tipo: 'verificar_codigo',
    });
  });

  it('con el código del correo, el administrador general entra al panel', () => {
    expect(resolverEstado({ ...base, verificada: true })).toEqual({ tipo: 'lista', perfil });
  });

  it('el administrador de una institución activa entra con el código (D-86)', () => {
    expect(resolverEstado({ ...base, verificada: true, perfil: institucional })).toEqual({
      tipo: 'lista',
      perfil: institucional,
    });
  });

  it('con su institución desactivada, el administrador institucional no entra', () => {
    for (const institucion of [{ ...colegio, activa: false }, null]) {
      expect(
        resolverEstado({ ...base, verificada: true, perfil: { ...institucional, institucion } }),
      ).toEqual({ tipo: 'sin_acceso', motivo: 'institucion_inactiva' });
    }
  });

  it('los roles antiguos no entran: profesional y consulta (D-65, D-86)', () => {
    for (const rol of ['profesional', 'consulta'] as const) {
      expect(resolverEstado({ ...base, verificada: true, perfil: { ...perfil, rol } })).toEqual({
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
        doble_factor: true,
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
