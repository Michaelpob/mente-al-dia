import { describe, expect, it } from 'vitest';
import { correoDeIngreso } from './correo';

describe('correo para ingresar', () => {
  it('quita las tildes, la diéresis y la virgulilla, que ningún correo de una cuenta lleva', () => {
    expect(correoDeIngreso('psicología.prueba@ejemplo.gov.co')).toBe(
      'psicologia.prueba@ejemplo.gov.co',
    );
    expect(correoDeIngreso('niñez.pingüino@ejemplo.gov.co')).toBe('ninez.pinguino@ejemplo.gov.co');
  });

  it('da igual si la tilde viene en un carácter o en dos (según el teclado)', () => {
    expect(correoDeIngreso('psicologi\u0301a@ejemplo.co')).toBe('psicologia@ejemplo.co');
  });

  it('pasa a minúsculas y quita los espacios que se cuelan al copiar', () => {
    expect(correoDeIngreso('  Psicología.Prueba@Ejemplo.gov.co \u200B')).toBe(
      'psicologia.prueba@ejemplo.gov.co',
    );
  });

  it('no cambia un correo bien escrito', () => {
    expect(correoDeIngreso('ana.perez+panel_1@correo.edu.co')).toBe(
      'ana.perez+panel_1@correo.edu.co',
    );
  });
});
