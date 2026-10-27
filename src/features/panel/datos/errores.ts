/** El error que devuelve la base cuando la sesión no tiene permiso (por ejemplo, perdió el rol). */
export function esFaltaDePermiso(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === '42501';
}
