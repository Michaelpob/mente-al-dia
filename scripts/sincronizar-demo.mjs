/**
 * Sincroniza la demostración pública (carpeta demo/) con el proyecto.
 *
 * La demo es un sitio estático (sin build) que se publica en GitHub Pages. Para que muestre
 * EXACTAMENTE el mismo contenido y el mismo cálculo que la plataforma, este script copia:
 *   - el contenido versionado (src/content/v1 y las líneas de ayuda) y el motor de resultados,
 *     convertidos de TypeScript a JavaScript (solo se quitan los tipos; la lógica no cambia);
 *   - los tokens del sistema visual (src/styles/tokens.css).
 *
 * Uso: corepack pnpm demo:sincronizar
 */
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const destinoJs = join(raiz, 'demo/assets/js/proyecto');
const destinoCss = join(raiz, 'demo/assets/css');

/** archivo de origen → nombre en la demo */
const modulos = [
  ['src/content/v1/areas.ts', 'areas.js'],
  ['src/content/v1/cuestionarios.ts', 'cuestionarios.js'],
  ['src/content/v1/mensajes.ts', 'mensajes.js'],
  ['src/content/v1/reglas.ts', 'reglas.js'],
  ['src/content/v1/registro.ts', 'registro.js'],
  ['src/content/lineas-ayuda.ts', 'lineas-ayuda.js'],
  ['src/lib/motor-resultados/motor.ts', 'motor.js'],
];

const encabezado = (origen) =>
  `// GENERADO por scripts/sincronizar-demo.mjs desde ${origen}. No editar a mano.\n`;

mkdirSync(destinoJs, { recursive: true });

for (const [origen, nombre] of modulos) {
  const codigo = readFileSync(join(raiz, origen), 'utf8');
  const { outputText, diagnostics } = ts.transpileModule(codigo, {
    fileName: origen,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      verbatimModuleSyntax: true,
    },
  });
  if (diagnostics?.length) {
    const mensajes = diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
    throw new Error(`${origen}: ${mensajes.join('; ')}`);
  }
  // Solo deben quedar importaciones de tipos (que TypeScript ya eliminó).
  if (/^\s*import\s/m.test(outputText)) {
    throw new Error(`${origen} importa código de otro archivo; la demo no puede resolverlo.`);
  }
  writeFileSync(join(destinoJs, nombre), encabezado(origen) + outputText);
  console.log(`✓ ${origen} → demo/assets/js/proyecto/${nombre}`);
}

copyFileSync(join(raiz, 'src/styles/tokens.css'), join(destinoCss, 'tokens.css'));
console.log('✓ src/styles/tokens.css → demo/assets/css/tokens.css');
