/**
 * Supabase entrega el QR como «data:image/svg+xml;utf-8,<svg…>» sin codificar; un «#» dentro del
 * SVG corta la dirección y la imagen no carga. Se vuelve a codificar el SVG.
 */
export function qrComoImagen(qr: string): string {
  const svg = qr.slice(qr.indexOf('<svg'));
  return svg.startsWith('<svg')
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    : qr;
}
