/**
 * Copia el motor de resultados y el contenido versionado a las Edge Functions de Supabase.
 *
 * Las funciones corren en Deno y se publican solo con lo que hay en supabase/functions, así que
 * el cálculo oficial usa una copia EXACTA de src/: el código no cambia, solo las rutas de
 * importación («@/types/dominio» → «./dominio.ts»), que Deno necesita con extensión.
 *
 * Uso: corepack pnpm funciones:sincronizar
 *      corepack pnpm funciones:sincronizar --comprobar   (falla si las copias están desactualizadas)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'supabase/functions/_compartido/generado');
const comprobar = process.argv.includes('--comprobar');

/** archivo de origen → nombre en las funciones */
const modulos = [
  ['src/types/dominio.ts', 'dominio.ts'],
  ['src/content/v1/areas.ts', 'areas.ts'],
  ['src/content/v1/cuestionarios.ts', 'cuestionarios.ts'],
  ['src/content/v1/reglas.ts', 'reglas.ts'],
  ['src/lib/motor-resultados/motor.ts', 'motor.ts'],
  ['src/lib/motor-resultados/index.ts', 'motor-resultados.ts'],
];

/** Importaciones de src/ → archivo copiado. */
const rutas = {
  '@/types/dominio': './dominio.ts',
  '@/content/v1/areas': './areas.ts',
  '@/content/v1/cuestionarios': './cuestionarios.ts',
  '@/content/v1/reglas': './reglas.ts',
  './motor': './motor.ts',
};

const encabezado = (origen) =>
  `// GENERADO por scripts/sincronizar-funciones.mjs desde ${origen}. No editar a mano.\n`;

function convertir(origen) {
  const codigo = readFileSync(join(raiz, origen), 'utf8');
  const convertido = codigo.replace(/(from\s+')([^']+)(')/g, (_, antes, ruta, despues) => {
    const nueva = rutas[ruta];
    if (!nueva)
      throw new Error(`${origen} importa «${ruta}», que las funciones no pueden resolver.`);
    return `${antes}${nueva}${despues}`;
  });
  return encabezado(origen) + convertido;
}

mkdirSync(destino, { recursive: true });
const desactualizados = [];

for (const [origen, nombre] of modulos) {
  const archivo = join(destino, nombre);
  const contenido = convertir(origen);
  if (comprobar) {
    if (!existsSync(archivo) || readFileSync(archivo, 'utf8') !== contenido)
      desactualizados.push(nombre);
    continue;
  }
  writeFileSync(archivo, contenido);
  console.log(`✓ ${origen} → supabase/functions/_compartido/generado/${nombre}`);
}

if (desactualizados.length) {
  console.error(
    `Las copias del motor en las funciones están desactualizadas (${desactualizados.join(', ')}).\n` +
      'Ejecuta: corepack pnpm funciones:sincronizar',
  );
  process.exit(1);
}
if (comprobar) console.log('✓ Las funciones usan el mismo motor y contenido que src/.');
