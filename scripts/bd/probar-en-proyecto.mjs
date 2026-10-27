// Corre migraciones y pruebas pgTAP en el proyecto enlazado (supabase link) dentro de un bloque DO que
// termina con un error a propósito: todo se deshace (funciones, usuarios y datos de prueba) y solo
// vuelve la salida TAP. Sirve donde no hay PostgreSQL local (D-72). Las pruebas no usan la secuencia de
// códigos reales; los números de identidad que consuman quedan como huecos, como en cualquier rollback.
// Uso: node scripts/bd/probar-en-proyecto.mjs supabase/migrations/<nueva>.sql supabase/tests/<prueba>.sql
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Divide SQL en sentencias, respetando comillas, $etiquetas$ y comentarios. */
function dividir(sql) {
  const sentencias = [];
  let actual = '';
  for (let i = 0; i < sql.length;) {
    const resto = sql.slice(i);
    const dolar = resto.match(/^\$[A-Za-z_]*\$/);
    if (resto.startsWith('--')) {
      const fin = sql.indexOf('\n', i);
      i = fin === -1 ? sql.length : fin;
    } else if (resto.startsWith('/*')) {
      i = sql.indexOf('*/', i) + 2;
    } else if (dolar) {
      const fin = sql.indexOf(dolar[0], i + dolar[0].length) + dolar[0].length;
      actual += sql.slice(i, fin);
      i = fin;
    } else if (sql[i] === "'" || sql[i] === '"') {
      let j = i + 1;
      while (j < sql.length && !(sql[j] === sql[i] && sql[j + 1] !== sql[i]))
        j += sql[j] === sql[i] ? 2 : 1;
      actual += sql.slice(i, j + 1);
      i = j + 1;
    } else if (sql[i] === ';') {
      sentencias.push(actual.trim());
      actual = '';
      i += 1;
    } else {
      actual += sql[i];
      i += 1;
    }
  }
  if (actual.trim()) sentencias.push(actual.trim());
  return sentencias.filter((s) => s && !/^(begin|rollback|commit)$/i.test(s));
}

const sentencias = process.argv.slice(2).flatMap((f) => dividir(readFileSync(f, 'utf8')));
const cuerpo = sentencias
  .map((s, n) => {
    const q = `$q${n}$`;
    if (s.includes(q)) throw new Error(`La sentencia ${n} contiene ${q}`);
    const devuelveTap = /^select\b/i.test(s) && !/^select\s+set_config\(/i.test(s);
    return devuelveTap
      ? `  for v_linea in execute ${q}${s}${q} loop v_salida := v_salida || coalesce(v_linea, '') || E'\\n'; end loop;`
      : `  execute ${q}${s}${q};`;
  })
  .join('\n');
const bloque = `do $prueba$\ndeclare\n  v_salida text := '';\n  v_linea text;\nbegin\n${cuerpo}\n  raise exception 'SALIDA_TAP%', E'\\n' || v_salida;\nend\n$prueba$;\n`;
const archivo = join(tmpdir(), `prueba-base-${process.pid}.sql`);
writeFileSync(archivo, bloque);

let salida = '';
try {
  salida = execFileSync(
    'npx',
    ['--yes', 'supabase@2.119.0', 'db', 'query', '--linked', '-f', archivo],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    },
  );
} catch (e) {
  salida = `${e.stdout ?? ''}${e.stderr ?? ''}`;
}
// El mensaje viene como JSON dentro de JSON: se desenvuelve hasta el texto de Postgres.
let mensaje = salida;
for (const linea of salida.split('\n')) {
  if (!linea.startsWith('{')) continue;
  try {
    const externo = JSON.parse(linea).error?.message ?? '';
    const interno = externo.slice(externo.indexOf('{'));
    mensaje = JSON.parse(interno).message ?? externo;
  } catch {
    mensaje = linea;
  }
}
const tap = mensaje.match(/SALIDA_TAP\n([\s\S]*?)(\nCONTEXT:|$)/);
console.log(tap ? tap[1] : mensaje);
const fallas = tap ? (tap[1].match(/^not ok/gm) ?? []).length : -1;
process.exit(tap && fallas === 0 ? 0 : 1);
