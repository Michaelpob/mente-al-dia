// Define la cuenta de administración del panel de la demostración pública (demo/panel.html).
// En demo/assets/js/config.js guarda el correo y la HUELLA de la contraseña (PBKDF2-SHA-256 con
// sal aleatoria), nunca la contraseña. La página compara la huella en el navegador.
//
// Uso:
//   corepack pnpm demo:admin -- --correo admin@ejemplo.co              pide la contraseña (no se ve)
//   corepack pnpm demo:admin -- --correo admin@ejemplo.co --generar    crea una contraseña segura
// Con --generar, la contraseña queda en acceso-admin-demo.local.md (no se sube a GitHub).
import { pbkdf2Sync, randomBytes, randomInt } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const ITERACIONES = 600_000;
const CONFIG = new URL('../demo/assets/js/config.js', import.meta.url);
const NOTA_LOCAL = new URL('../acceso-admin-demo.local.md', import.meta.url);
const INICIO = '// <admin-panel> (generado por scripts/definir-admin-demo.mjs)';
const FIN = '// </admin-panel>';

function argumento(nombre) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Contraseña aleatoria fácil de copiar: 4 grupos de 4, sin caracteres que se confunden. */
function generarContrasena() {
  const alfabeto = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const grupos = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => alfabeto[randomInt(alfabeto.length)]).join(''),
  );
  return grupos.join('-');
}

function preguntarOculto(pregunta) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let mostrada = false;
    rl._writeToOutput = (texto) => {
      if (!mostrada) {
        process.stdout.write(texto);
        mostrada = true;
      }
    };
    rl.question(pregunta, (respuesta) => {
      rl.close();
      process.stdout.write('\n');
      resolve(respuesta);
    });
  });
}

function huella(contrasena, salHex, iteraciones = ITERACIONES) {
  return pbkdf2Sync(contrasena, Buffer.from(salHex, 'hex'), iteraciones, 32, 'sha256').toString(
    'hex',
  );
}

async function principal() {
  const correo = argumento('correo')?.trim().toLowerCase();
  if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    console.error('Indica un correo válido: --correo admin@ejemplo.co');
    process.exit(1);
  }

  const generar = process.argv.includes('--generar');
  const contrasena = generar
    ? generarContrasena()
    : (process.env.ADMIN_DEMO_CONTRASENA ??
      (await preguntarOculto('Contraseña (mínimo 12 caracteres): ')));
  if (contrasena.length < 12) {
    console.error('La contraseña debe tener al menos 12 caracteres.');
    process.exit(1);
  }

  const sal = randomBytes(16).toString('hex');
  const bloque = `${INICIO}
/**
 * Cuenta de administración del panel de la demostración (D-64). Solo está la huella de la
 * contraseña (PBKDF2-SHA-256), no la contraseña. Para cambiarla: corepack pnpm demo:admin.
 */
export const adminPanel = {
  correo: '${correo}',
  sal: '${sal}',
  iteraciones: ${ITERACIONES},
  huella: '${huella(contrasena, sal)}',
};
${FIN}`;

  const config = readFileSync(CONFIG, 'utf8');
  const desde = config.indexOf(INICIO);
  const hasta = config.indexOf(FIN);
  const nuevo =
    desde >= 0 && hasta > desde
      ? config.slice(0, desde) + bloque + config.slice(hasta + FIN.length)
      : `${config.trimEnd()}\n\n${bloque}\n`;
  writeFileSync(CONFIG, nuevo);
  console.log(`Cuenta del panel actualizada para ${correo} en demo/assets/js/config.js.`);

  if (generar) {
    writeFileSync(
      NOTA_LOCAL,
      `# Acceso de administración al panel de la demostración

Este archivo NO se sube a GitHub (está en .gitignore). Guárdalo en un lugar seguro.

- Página: https://michaelpob.github.io/mente-al-dia/panel.html
- Correo: ${correo}
- Contraseña: ${contrasena}

Para cambiar el correo o la contraseña:

\`\`\`bash
corepack pnpm demo:admin -- --correo ${correo}
\`\`\`

Luego hay que volver a publicar la demostración (rama gh-pages).
`,
    );
    console.log(
      'La contraseña generada quedó en acceso-admin-demo.local.md (no se sube a GitHub).',
    );
  }
}

await principal();
