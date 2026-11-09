import { describe, expect, it } from 'vitest';
import { esMarcable, lineaEmergencias, lineasPara, numeroVisible } from './lineas-ayuda';

describe('líneas de ayuda por institución (D-90)', () => {
  const ids = (sede: string | null, todas = false) =>
    lineasPara(sede, { todas }).map((linea) => linea.id);

  it('sin institución se ven solo las generales, con el 123 al final', () => {
    expect(ids(null)).toEqual([
      'salud-mental-106',
      'tolima-linea-naranja',
      'tolima-hablalo',
      'emergencias',
    ]);
    expect(lineaEmergencias?.numero).toBe('123');
  });

  it('quien participa con la Alcaldía de Coello ve también la línea del municipio', () => {
    expect(ids('alcaldia-coello')).toContain('coello-apoyo-emocional');
    expect(ids('alcaldia-sanluis')).not.toContain('coello-apoyo-emocional');
  });

  it('la página de líneas de ayuda las muestra todas', () => {
    expect(ids(null, true)).toContain('coello-apoyo-emocional');
  });

  it('el número de Coello se marca y se lee agrupado', () => {
    const coello = lineasPara('alcaldia-coello').find((l) => l.id === 'coello-apoyo-emocional');
    expect(coello && esMarcable(coello.numero)).toBe(true);
    expect(coello && numeroVisible(coello.numero)).toBe('318 783 4690');
  });
});
