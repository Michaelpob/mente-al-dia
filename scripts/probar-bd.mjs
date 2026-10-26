/**
 * Prueba las migraciones y los permisos de la base de datos sin Docker.
 *
 * Crea una base de datos vacía en un PostgreSQL local con pgTAP, carga la simulación mínima de
 * Supabase (scripts/bd/simulacion-supabase.sql), aplica supabase/migrations en orden y ejecuta
 * las pruebas de supabase/tests. Con la CLI de Supabase y Docker, lo equivalente es
 * `supabase test db`, que usa las mismas pruebas.
 *
 * Uso: BD_PRUEBAS_URL=postgres://postgres@localhost:5432/postgres corepack pnpm test:bd
 * La URL apunta a una base de administración; la base «mente_al_dia_pruebas» se borra y se crea.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const urlAdmin = process.env.BD_PRUEBAS_URL;
if (!urlAdmin) {
  console.error(
    'Define BD_PRUEBAS_URL (PostgreSQL 15 o superior con la extensión pgTAP instalada).',
  );
  process.exit(1);
}

const BASE = 'mente_al_dia_pruebas';
const urlPruebas = new URL(urlAdmin);
urlPruebas.pathname = `/${BASE}`;

const psql = (url, args) =>
  execFileSync('psql', [url.toString(), '-X', '-q', '-v', 'ON_ERROR_STOP=1', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

psql(urlAdmin, [
  '-c',
  `drop database if exists ${BASE} with (force)`,
  '-c',
  `create database ${BASE}`,
]);

psql(urlPruebas, ['-f', join(raiz, 'scripts/bd/simulacion-supabase.sql')]);
const migraciones = readdirSync(join(raiz, 'supabase/migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort();
for (const archivo of migraciones) {
  psql(urlPruebas, ['-f', join(raiz, 'supabase/migrations', archivo)]);
  console.log(`✓ migración ${archivo}`);
}

const pruebas = readdirSync(join(raiz, 'supabase/tests'))
  .filter((f) => f.endsWith('.sql'))
  .sort();
let fallas = 0;
for (const archivo of pruebas) {
  let salida;
  try {
    salida = psql(urlPruebas, ['-t', '-A', '-f', join(raiz, 'supabase/tests', archivo)]);
  } catch (error) {
    fallas += 1;
    console.error(`✗ ${archivo}\n${error.stdout ?? ''}${error.stderr ?? ''}`);
    continue;
  }
  const lineas = salida.split('\n');
  const malas = lineas.filter((l) => /^not ok/.test(l) || /^# Looks like/.test(l));
  const buenas = lineas.filter((l) => /^ok /.test(l)).length;
  if (malas.length) {
    fallas += 1;
    console.error(
      `✗ ${archivo}\n${lineas.filter((l) => l.startsWith('not ok') || l.startsWith('#')).join('\n')}`,
    );
  } else {
    console.log(`✓ ${archivo} (${buenas} comprobaciones)`);
  }
}

if (fallas) {
  console.error(`\n${fallas} archivo(s) de pruebas con fallas.`);
  process.exit(1);
}
console.log('\nBase de datos: todas las pruebas pasaron.');
