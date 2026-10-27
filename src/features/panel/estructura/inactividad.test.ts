import { describe, expect, it } from 'vitest';
import { AVISO_INACTIVIDAD_MS, LIMITE_INACTIVIDAD_MS, faseInactividad } from './inactividad';

const T0 = 1_000_000;

describe('faseInactividad', () => {
  it('está activa hasta el último minuto', () => {
    expect(faseInactividad(T0, T0)).toEqual({ fase: 'activa', segundos: 0 });
    expect(faseInactividad(T0 + LIMITE_INACTIVIDAD_MS - AVISO_INACTIVIDAD_MS - 1, T0).fase).toBe(
      'activa',
    );
  });

  it('avisa en el último minuto y cuenta los segundos que quedan', () => {
    expect(faseInactividad(T0 + LIMITE_INACTIVIDAD_MS - AVISO_INACTIVIDAD_MS, T0)).toEqual({
      fase: 'aviso',
      segundos: 60,
    });
    expect(faseInactividad(T0 + LIMITE_INACTIVIDAD_MS - 1_500, T0)).toEqual({
      fase: 'aviso',
      segundos: 2,
    });
  });

  it('vence a los 15 minutos', () => {
    expect(faseInactividad(T0 + LIMITE_INACTIVIDAD_MS, T0)).toEqual({
      fase: 'vencida',
      segundos: 0,
    });
    expect(faseInactividad(T0 + 2 * LIMITE_INACTIVIDAD_MS, T0).fase).toBe('vencida');
  });
});
