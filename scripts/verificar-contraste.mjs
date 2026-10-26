// Verifica el contraste WCAG 2.1 de los pares de color que usa el sitio.
// Lee los tokens de src/styles/tokens.css (tema normal y alto contraste).
// Uso: pnpm contraste   → sale con código 1 si algún par no cumple.
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

function readBlock(selectorPattern) {
  const match = css.match(selectorPattern);
  if (!match) throw new Error(`No se encontró el bloque ${selectorPattern}`);
  const tokens = {};
  for (const [, name, value] of match[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[name] = value.toLowerCase();
  }
  return tokens;
}

const normal = readBlock(/^:root\s*\{([\s\S]*?)^\}/m);
const alto = { ...normal, ...readBlock(/:root\[data-contraste='alto'\]\s*\{([\s\S]*?)\}/) };

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const TEXTO = 4.5; // texto normal (AA)
const COMPONENTE = 3; // bordes de campos, foco e íconos (AA, 1.4.11)

const fondosClaros = [
  'piedra-50',
  'piedra-100',
  'blanco',
  'pizarra-100',
  'salvia-100',
  'arena-100',
];
const pares = [
  ...['grafito-900', 'grafito-600', 'pizarra-700'].flatMap((texto) =>
    fondosClaros.map((fondo) => [texto, fondo, TEXTO]),
  ),
  ['grafito-500', 'piedra-50', TEXTO],
  ['grafito-500', 'piedra-100', TEXTO],
  ['grafito-500', 'blanco', TEXTO],
  ['pizarra-800', 'pizarra-100', TEXTO],
  ['pizarra-800', 'salvia-100', TEXTO],
  ['blanco', 'pizarra-700', TEXTO],
  ['blanco', 'pizarra-800', TEXTO],
  ['blanco', 'salvia-600', TEXTO],
  ['blanco', 'grafito-900', TEXTO],
  ['salvia-600', 'piedra-50', TEXTO],
  ['salvia-600', 'piedra-100', TEXTO],
  ['salvia-600', 'blanco', TEXTO],
  ['salvia-600', 'salvia-100', TEXTO],
  ['nivel-adecuado', 'nivel-adecuado-fondo', TEXTO],
  ['nivel-fortalecer', 'nivel-fortalecer-fondo', TEXTO],
  ['nivel-atencion', 'nivel-atencion-fondo', TEXTO],
  ['nivel-sin-dato', 'nivel-sin-dato-fondo', TEXTO],
  ['nivel-adecuado', 'blanco', TEXTO],
  ['nivel-fortalecer', 'blanco', TEXTO],
  ['nivel-atencion', 'blanco', TEXTO],
  ['nivel-atencion', 'arena-100', TEXTO],
  ['nivel-sin-dato', 'blanco', TEXTO],
  ['borde-campo', 'blanco', COMPONENTE],
  ['borde-campo', 'piedra-50', COMPONENTE],
  ['foco', 'piedra-50', COMPONENTE],
  ['foco', 'blanco', COMPONENTE],
  ['foco', 'piedra-100', COMPONENTE],
  // Inicio: botón claro sobre el cierre oscuro y los íconos de la rueda sobre su dimensión.
  ['pizarra-800', 'blanco', TEXTO],
  ...['emociones', 'cuerpo', 'vinculos', 'afrontamiento', 'proyecto'].map((d) => [
    'grafito-900',
    `dimension-${d}`,
    COMPONENTE,
  ]),
  // Resultados: íconos de la rueda sobre el color de cada nivel.
  ...['adecuado', 'fortalecer', 'atencion', 'sin-dato'].map((n) => [
    'grafito-900',
    `rueda-${n}`,
    COMPONENTE,
  ]),
];

// Combinaciones que NO cumplen y por eso están prohibidas en el diseño (se informan, no fallan).
const restricciones = [
  ['borde-campo', 'piedra-100', COMPONENTE, 'los campos van sobre blanco o piedra-50'],
];

let fallas = 0;
for (const [nombre, tema] of [
  ['Tema normal', normal],
  ['Alto contraste', alto],
]) {
  console.log(`\n${nombre}`);
  for (const [texto, fondo, minimo] of pares) {
    const valor = ratio(tema[texto], tema[fondo]);
    const ok = valor >= minimo;
    if (!ok) fallas += 1;
    console.log(
      `${ok ? 'OK   ' : 'FALLA'} ${valor.toFixed(2).padStart(5)}:1 (mín. ${minimo}) ${texto} sobre ${fondo}`,
    );
  }
}

console.log('\nCombinaciones prohibidas (no se usan en el sitio)');
for (const [texto, fondo, minimo, motivo] of restricciones) {
  const valor = ratio(normal[texto], normal[fondo]);
  console.log(`NO USAR ${valor.toFixed(2)}:1 (mín. ${minimo}) ${texto} sobre ${fondo}: ${motivo}`);
}

console.log(fallas === 0 ? '\nTodos los pares cumplen AA.' : `\n${fallas} pares no cumplen.`);
process.exit(fallas === 0 ? 0 : 1);
