/** Variable de entorno obligatoria de la función: si falta, la función no arranca. */
export function variable(nombre: string): string {
  const valor = Deno.env.get(nombre);
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}.`);
  return valor;
}
