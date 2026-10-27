import { describe, expect, it } from 'vitest';
import {
  REGISTROS_POR_DEFECTO,
  escribirFiltrosRegistros,
  escribirFiltrosTablero,
  hayFiltros,
  hoyEnColombia,
  leerFiltrosRegistros,
  leerFiltrosTablero,
  periodoDe,
  sumarDias,
  tableroPorDefecto,
  variacion,
} from './filtros';

const HOY = '2026-10-27';
const p = (texto: string) => new URLSearchParams(texto);

describe('fechas', () => {
  it('el día de hoy es el de Colombia, no el de UTC', () => {
    // 2026-10-28 03:00 UTC son las 22:00 del 27 en Bogotá.
    expect(hoyEnColombia(new Date('2026-10-28T03:00:00Z'))).toBe('2026-10-27');
  });

  it('suma días cruzando meses y años', () => {
    expect(sumarDias('2026-10-27', -29)).toBe('2026-09-28');
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('filtros del tablero', () => {
  it('por defecto son los últimos 30 días', () => {
    expect(leerFiltrosTablero(p(''), HOY)).toEqual(tableroPorDefecto(HOY));
    expect(tableroPorDefecto(HOY)).toEqual({
      desde: '2026-09-28',
      hasta: HOY,
      modulo: null,
      lugar: null,
    });
  });

  it('lee un periodo, un módulo y un lugar válidos', () => {
    expect(
      leerFiltrosTablero(
        p('desde=2026-01-01&hasta=2026-03-31&modulo=nino&lugar=%20Centro%20'),
        HOY,
      ),
    ).toEqual({
      desde: '2026-01-01',
      hasta: '2026-03-31',
      modulo: 'nino',
      lugar: 'Centro',
    });
  });

  it('ignora fechas imposibles, periodos al revés y módulos que no existen', () => {
    const base = tableroPorDefecto(HOY);
    expect(leerFiltrosTablero(p('desde=2026-02-30&hasta=2026-03-01'), HOY).desde).toBe(base.desde);
    expect(leerFiltrosTablero(p('desde=2026-05-01&hasta=2026-04-01'), HOY).desde).toBe(base.desde);
    expect(leerFiltrosTablero(p('modulo=gerencia'), HOY).modulo).toBeNull();
  });

  it('solo escribe en la dirección lo que cambia', () => {
    expect(escribirFiltrosTablero(tableroPorDefecto(HOY), HOY).toString()).toBe('');
    const f = {
      desde: '2026-01-01',
      hasta: '2026-01-31',
      modulo: 'adulto' as const,
      lugar: 'Norte',
    };
    expect(leerFiltrosTablero(escribirFiltrosTablero(f, HOY), HOY)).toEqual(f);
  });

  it('reconoce los periodos predefinidos', () => {
    expect(periodoDe(tableroPorDefecto(HOY), HOY)).toBe(30);
    expect(periodoDe({ desde: sumarDias(HOY, -6), hasta: HOY }, HOY)).toBe(7);
    expect(periodoDe({ desde: sumarDias(HOY, -6), hasta: sumarDias(HOY, -1) }, HOY)).toBe(
      'personalizado',
    );
  });

  it('calcula la variación frente al periodo anterior', () => {
    expect(variacion(15, 10)).toBe(50);
    expect(variacion(5, 10)).toBe(-50);
    expect(variacion(3, 0)).toBeNull();
  });
});

describe('filtros de los registros', () => {
  it('sin parámetros son los de por defecto', () => {
    expect(leerFiltrosRegistros(p(''))).toEqual(REGISTROS_POR_DEFECTO);
    expect(escribirFiltrosRegistros(REGISTROS_POR_DEFECTO).toString()).toBe('');
  });

  it('ida y vuelta por la dirección', () => {
    const f = {
      ...REGISTROS_POR_DEFECTO,
      q: 'ana',
      desde: '2026-10-01',
      modulo: 'adulto' as const,
      resultado: 'desafios' as const,
      area: 'bienestar_emocional' as const,
      nivel: 'requiere_atencion' as const,
      prioridad: false,
      estado: 'pendiente' as const,
      orden: 'nombre' as const,
      descendente: false,
      pagina: 3,
      tamano: 50,
    };
    expect(leerFiltrosRegistros(escribirFiltrosRegistros(f))).toEqual(f);
  });

  it('ignora valores inválidos en lugar de enviarlos a la base', () => {
    const f = leerFiltrosRegistros(
      p('orden=correo&pagina=-2&tamano=7&estado=archivado&area=inventada&nivel=adecuado'),
    );
    expect(f.orden).toBe('fecha');
    expect(f.pagina).toBe(1);
    expect(f.tamano).toBe(25);
    expect(f.estado).toBeNull();
    expect(f.area).toBeNull();
    expect(f.nivel).toBeNull();
  });

  it('el área solo filtra con un nivel', () => {
    expect(leerFiltrosRegistros(p('area=bienestar_emocional')).area).toBeNull();
  });

  it('ordena las fechas si vienen al revés', () => {
    const f = leerFiltrosRegistros(p('desde=2026-10-20&hasta=2026-10-01'));
    expect([f.desde, f.hasta]).toEqual(['2026-10-01', '2026-10-20']);
  });

  it('distingue cuándo hay filtros además de la búsqueda', () => {
    expect(hayFiltros({ ...REGISTROS_POR_DEFECTO, q: 'ana' })).toBe(false);
    expect(hayFiltros({ ...REGISTROS_POR_DEFECTO, prioridad: false })).toBe(true);
  });
});
