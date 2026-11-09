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
const base = { haySesion: true, nivel: 'aal1' as const, factoresVerificados: [], perfil };

describe('resolverEstado', () => {
  it('sin sesión pide ingresar', () => {
    expect(resolverEstado({ ...base, haySesion: false })).toEqual({ tipo: 'sin_sesion' });
  });

  it('una cuenta sin perfil no llega al doble factor', () => {
    expect(resolverEstado({ ...base, perfil: null })).toEqual({
      tipo: 'sin_acceso',
      motivo: 'sin_perfil',
    });
  });

  it('una cuenta desactivada no entra aunque tenga doble factor', () => {
    expect(
      resolverEstado({ ...base, nivel: 'aal2', perfil: { ...perfil, activo: false } }),
    ).toEqual({
      tipo: 'sin_acceso',
      motivo: 'inactivo',
    });
  });

  it('el administrador de una institución activa entra con doble factor (D-86)', () => {
    expect(
      resolverEstado({
        ...base,
        nivel: 'aal2',
        factoresVerificados: ['f1'],
        perfil: institucional,
      }),
    ).toEqual({ tipo: 'lista', perfil: institucional });
  });

  it('con su institución desactivada, el administrador institucional no entra', () => {
    for (const institucion of [{ ...colegio, activa: false }, null]) {
      expect(
        resolverEstado({
          ...base,
          nivel: 'aal2',
          factoresVerificados: ['f1'],
          perfil: { ...institucional, institucion },
        }),
      ).toEqual({ tipo: 'sin_acceso', motivo: 'institucion_inactiva' });
    }
  });

  it('los roles antiguos no entran: profesional y consulta (D-65, D-86)', () => {
    for (const rol of ['profesional', 'consulta'] as const) {
      expect(
        resolverEstado({
          ...base,
          nivel: 'aal2',
          factoresVerificados: ['f1'],
          perfil: { ...perfil, rol },
        }),
      ).toEqual({ tipo: 'sin_acceso', motivo: 'sin_permiso' });
    }
  });

  it('sin factores verificados pide activar el doble factor', () => {
    expect(resolverEstado(base)).toEqual({ tipo: 'inscribir_doble_factor' });
  });

  it('con un factor verificado pide el código', () => {
    expect(resolverEstado({ ...base, factoresVerificados: ['f1', 'f2'] })).toEqual({
      tipo: 'verificar_doble_factor',
      factorId: 'f1',
    });
  });

  it('con doble factor (aal2) y perfil activo entra al panel', () => {
    expect(resolverEstado({ ...base, nivel: 'aal2', factoresVerificados: ['f1'] })).toEqual({
      tipo: 'lista',
      perfil,
    });
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
