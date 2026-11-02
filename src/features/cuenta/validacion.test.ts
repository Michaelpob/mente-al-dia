import { describe, expect, it } from 'vitest';
import {
  contrasenaValida,
  hayErrores,
  normalizarUsuario,
  validarCrearCuenta,
  validarIngreso,
  validarNuevaContrasena,
  type DatosCrearCuenta,
} from './validacion';

const valido: DatosCrearCuenta = {
  nombre: 'Ana María Pérez',
  usuario: 'ana.perez',
  correo: 'ana@correo.co',
  contrasena: 'Cuidarme2026',
  confirmacion: 'Cuidarme2026',
  mayorDeEdad: true,
  autoriza: true,
};

describe('crear una cuenta', () => {
  it('acepta datos completos y válidos', () => {
    expect(validarCrearCuenta(valido)).toEqual({});
  });

  it('pide todos los campos', () => {
    const errores = validarCrearCuenta({
      nombre: '',
      usuario: '',
      correo: '',
      contrasena: '',
      confirmacion: '',
      mayorDeEdad: false,
      autoriza: false,
    });
    expect(Object.keys(errores).sort()).toEqual(
      [
        'autoriza',
        'confirmacion',
        'contrasena',
        'correo',
        'mayorDeEdad',
        'nombre',
        'usuario',
      ].sort(),
    );
  });

  it('revisa el formato del correo', () => {
    expect(validarCrearCuenta({ ...valido, correo: 'ana@correo' }).correo).toBeTruthy();
    expect(validarCrearCuenta({ ...valido, correo: 'ana correo.co' }).correo).toBeTruthy();
  });

  it('pide que las contraseñas coincidan', () => {
    expect(
      validarCrearCuenta({ ...valido, confirmacion: 'Cuidarme2027' }).confirmacion,
    ).toBeTruthy();
  });

  it('el usuario sigue la misma regla que la base de datos, sin importar mayúsculas', () => {
    expect(normalizarUsuario('  Ana.Perez ')).toBe('ana.perez');
    expect(validarCrearCuenta({ ...valido, usuario: 'Ana.Perez' }).usuario).toBeUndefined();
    expect(validarCrearCuenta({ ...valido, usuario: '1ana' }).usuario).toBeTruthy();
    expect(validarCrearCuenta({ ...valido, usuario: 'an' }).usuario).toBeTruthy();
    expect(validarCrearCuenta({ ...valido, usuario: 'ana perez' }).usuario).toBeTruthy();
  });
});

describe('contraseñas', () => {
  it('exige 12 caracteres con mayúsculas, minúsculas y números, como Supabase Auth', () => {
    expect(contrasenaValida('Cuidarme2026')).toBe(true);
    expect(contrasenaValida('cuidarme2026')).toBe(false);
    expect(contrasenaValida('CUIDARME2026')).toBe(false);
    expect(contrasenaValida('Cuidarmeahora')).toBe(false);
    expect(contrasenaValida('Cuidar2026')).toBe(false);
  });

  it('la contraseña nueva también debe coincidir', () => {
    expect(hayErrores(validarNuevaContrasena('Cuidarme2026', 'Cuidarme2026'))).toBe(false);
    expect(validarNuevaContrasena('Cuidarme2026', 'otra').confirmacion).toBeTruthy();
  });
});

describe('ingresar', () => {
  it('pide un correo válido y la contraseña', () => {
    expect(validarIngreso('ana@correo.co', 'x')).toEqual({});
    expect(Object.keys(validarIngreso('ana', ''))).toEqual(['correo', 'contrasena']);
  });
});
