import { describe, expect, it } from 'vitest';
import { resolverEstado, type PerfilPanel } from './estado-sesion';

const perfil: PerfilPanel = { id: 'p1', nombre: 'Profesional', rol: 'profesional', activo: true };
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
