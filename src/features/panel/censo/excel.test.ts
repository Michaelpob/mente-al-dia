import type { FillPattern, Worksheet } from 'exceljs';
import { describe, expect, it } from 'vitest';
import type { ExportacionCenso } from '../datos/tipos';
import {
  cargarExcelJS,
  construirLibroCenso,
  describirPeriodo,
  fechaExcel,
  nombreArchivoCenso,
} from './excel';

const DATOS: ExportacionCenso = {
  // 9:30 p. m. del 5 de noviembre en Colombia: ya es 6 de noviembre en UTC.
  generadoEn: '2026-11-06T02:30:00Z',
  generadoPor: 'Psicóloga Prueba',
  resumen: {
    personas: 2,
    cuestionarios: 3,
    conPrioridad: 1,
    conFalencias: 1,
    porModulo: { adulto: 1, nino: 1 },
    resultados: { desafios: 1, favorable: 1 },
    porEdad: [{ edad: 9, n: 1 }],
    porSexo: [{ sexo: 'Mujer', n: 1 }],
    porGrado: [{ grado: 'Cuarto', n: 1 }],
    lugares: [{ lugar: 'Centro', n: 2 }],
    areas: [
      { area: 'bienestar_emocional', nivel: 'requiere_atencion', n: 1 },
      { area: 'bienestar_emocional', nivel: 'adecuado', n: 1 },
    ],
  },
  personas: [
    {
      id: 'a1',
      codigo: 'MD-0001',
      // 9:00 p. m. del 26 de octubre en Colombia.
      creadoEn: '2026-10-27T02:00:00Z',
      nombre: 'Ana Prueba',
      modulo: 'adulto',
      edad: null,
      sexo: null,
      grado: null,
      lugar: 'Centro',
      resultadoGeneral: 'desafios',
      prioridad: true,
      niveles: { bienestar_emocional: 'requiere_atencion', sueno_descanso: 'por_fortalecer' },
      cuestionarios: 2,
      fortalezas: 0,
      porFortalecer: 1,
      falencias: 1,
      sinDato: 18,
    },
    {
      id: 'b1',
      codigo: 'MD-0002',
      creadoEn: '2026-11-01T15:00:00Z',
      nombre: 'Niña Prueba',
      modulo: 'nino',
      edad: 9,
      sexo: null,
      grado: 'Cuarto',
      lugar: 'Centro',
      resultadoGeneral: 'favorable',
      prioridad: false,
      niveles: { bienestar_emocional: 'adecuado' },
      cuestionarios: 1,
      fortalezas: 1,
      porFortalecer: 0,
      falencias: 0,
      sinDato: 19,
    },
  ],
};

/** Todos los textos de una hoja, para buscar en ellos. */
function textos(hoja: Worksheet): string[] {
  const lista: string[] = [];
  hoja.eachRow((fila) => fila.eachCell((celda) => lista.push(String(celda.value))));
  return lista;
}

describe('Excel del censo', () => {
  it('nombra el archivo con el día de Colombia', () => {
    expect(nombreArchivoCenso(DATOS.generadoEn)).toBe('censo-mente-al-dia-2026-11-05.xlsx');
  });

  it('describe el periodo elegido', () => {
    expect(describirPeriodo({ desde: null, hasta: null })).toBe('Todo el tiempo');
    expect(describirPeriodo({ desde: '2026-01-01', hasta: '2026-11-05' })).toBe(
      'Del 1 de enero de 2026 al 5 de noviembre de 2026',
    );
    expect(describirPeriodo({ desde: '2026-01-01', hasta: null })).toBe(
      'Desde el 1 de enero de 2026',
    );
  });

  it('guarda la fecha del cuestionario como el día de Colombia', () => {
    expect(fechaExcel('2026-10-27T02:00:00Z').toISOString()).toBe('2026-10-26T00:00:00.000Z');
  });

  it('arma las hojas Resumen, Áreas y Personas, y el archivo se puede volver a abrir', async () => {
    const excel = await cargarExcelJS();
    const libro = construirLibroCenso(excel, DATOS, {
      filtros: { desde: null, hasta: null, modulo: null, lugar: null },
      motivo: 'Informe mensual de prueba',
    });
    const leido = new excel.Workbook();
    await leido.xlsx.load(await libro.xlsx.writeBuffer());
    expect(leido.worksheets.map((h) => h.name)).toEqual(['Resumen', 'Áreas', 'Personas']);

    const resumen = textos(leido.getWorksheet('Resumen')!);
    expect(resumen).toContain('Informe mensual de prueba');
    expect(resumen).toContain('Psicóloga Prueba');
    expect(resumen).toContain('Todo el tiempo');
    expect(resumen).toContain('Personas en el censo');

    const areas = leido.getWorksheet('Áreas')!.getRow(2);
    expect(areas.getCell(2).value).toBe('Bienestar emocional');
    expect([areas.getCell(4).value, areas.getCell(8).value, areas.getCell(9).value]).toEqual([
      1, 1, 0.5,
    ]);

    const personas = leido.getWorksheet('Personas')!;
    const cabeza = personas.getRow(1).values as unknown[];
    expect(cabeza).toContain('Nombre');
    expect(cabeza).toContain('1. Bienestar emocional');
    expect(cabeza).toContain('20. Bienestar psicológico general');

    const ana = personas.getRow(2);
    expect(ana.getCell(1).value).toBe('Ana Prueba');
    expect((ana.getCell(8).value as Date).toISOString()).toBe('2026-10-26T00:00:00.000Z');
    expect(ana.getCell(11).value).toBe('Sí');
    expect(ana.getCell(16).value).toBe('Bienestar emocional');
    expect(ana.getCell(17).value).toBe('Sueño y descanso');
    // El área va con el texto del nivel y su color, nunca solo el color.
    expect(ana.getCell(19).value).toBe('Falencia');
    expect((ana.getCell(19).fill as FillPattern).fgColor?.argb).toBe('FFFAD4DD');
    // A una persona adulta no se le pregunta el sexo; a una niña que no respondió, sí.
    expect(ana.getCell(5).value).toBeNull();
    expect(personas.getRow(3).getCell(5).value).toBe('Prefirió no responder');
    expect(personas.getRow(3).getCell(19).value).toBe('Fortaleza');
    expect(personas.getRow(3).getCell(20).value).toBe('Sin dato');
  });
});
