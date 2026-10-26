import { describe, expect, it } from 'vitest';
import { qrComoImagen } from './qr';

describe('qrComoImagen', () => {
  it('codifica el SVG que Supabase entrega sin codificar', () => {
    const qr = qrComoImagen('data:image/svg+xml;utf-8,<svg fill="#000"></svg>');
    expect(qr).toBe('data:image/svg+xml;charset=utf-8,%3Csvg%20fill%3D%22%23000%22%3E%3C%2Fsvg%3E');
  });

  it('deja igual lo que no es un SVG', () => {
    expect(qrComoImagen('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });
});
