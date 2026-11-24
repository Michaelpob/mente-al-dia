/**
 * El correo de una cuenta tal como lo guarda Supabase Auth: en minúsculas, sin espacios y sin tildes.
 * Supabase no admite tildes en los correos (Gmail tampoco), pero es común escribirlos o copiarlos con
 * ellas: «Psicología.Prueba@…» entra como «psicologia.prueba@…». Solo se usa para ingresar y para
 * recuperar la contraseña, donde el correo busca una cuenta que ya existe.
 */
export function correoDeIngreso(correo: string): string {
  return correo
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[\s\u200B\u2060\uFEFF]/g, '')
    .toLowerCase();
}
