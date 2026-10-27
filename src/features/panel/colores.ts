/** Color de un token del sistema de diseño, para las gráficas (que no leen variables CSS). */
export function colorToken(nombre: string, respaldo: string): string {
  if (typeof window === 'undefined') return respaldo;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(`--${nombre}`).trim() || respaldo
  );
}
