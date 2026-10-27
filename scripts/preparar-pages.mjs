// Prepara la publicación de la plataforma en GitHub Pages (rama gh-pages), en dist-pages/.
// - Compila la plataforma con la base /mente-al-dia/.
// - Copia index.html en la carpeta de cada ruta (GitHub Pages no reescribe direcciones) y en 404.html.
// - Crea redirecciones desde las direcciones antiguas (demostración y plataforma/).
// Mientras no haya Supabase conectado (VITE_SUPABASE_URL), el cuestionario muestra el resultado
// calculado en el navegador, marcado como no guardado (VITE_EJEMPLOS=true, D-62).
// Uso: corepack pnpm pages:preparar   (luego se publica dist-pages/ en la rama gh-pages)
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, loadEnv } from 'vite';

const BASE = '/mente-al-dia/';
const raiz = fileURLToPath(new URL('..', import.meta.url));
const salida = fileURLToPath(new URL('../dist-pages/', import.meta.url));

/**
 * Rutas de src/app/router.tsx (sin la guía de estilo, que no existe en producción). La ficha
 * (/panel/registros/:id) no tiene carpeta: la sirve 404.html, que también carga la plataforma.
 */
const RUTAS = [
  'registro',
  'cuestionario',
  'resultados',
  'ingresar',
  'lineas-de-ayuda',
  'privacidad',
  'terminos',
  'accesibilidad',
  'mapa-del-sitio',
  'panel',
  'panel/registros',
  'panel/prioritarios',
  'panel/seguimiento',
  'panel/reportes',
  'panel/configuracion',
  'panel/usuarios',
  'panel/auditoria',
  'panel/ingresar',
  'panel/definir-contrasena',
];

/** Direcciones publicadas antes (demostración y plataforma/) → ruta nueva. */
const REDIRECCIONES = {
  'panel.html': 'panel/',
  'cuestionario.html': 'registro/',
  'resultados.html': 'resultados/',
  'proyecto.html': '',
  plataforma: '',
  ...Object.fromEntries(RUTAS.map((ruta) => [`plataforma/${ruta}`, `${ruta}/`])),
};

const entorno = loadEnv('production', raiz, 'VITE_');
const conBaseDeDatos = Boolean(process.env.VITE_SUPABASE_URL ?? entorno.VITE_SUPABASE_URL);
if (!conBaseDeDatos) process.env.VITE_EJEMPLOS = 'true';

await build({
  root: raiz,
  configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
  base: BASE,
  logLevel: 'warn',
  build: { outDir: salida, emptyOutDir: true },
});

const index = join(salida, 'index.html');
for (const ruta of RUTAS) {
  mkdirSync(join(salida, ruta), { recursive: true });
  copyFileSync(index, join(salida, ruta, 'index.html'));
}
// Cualquier otra dirección carga la plataforma, que muestra su página «No encontramos esta página».
copyFileSync(index, join(salida, '404.html'));
writeFileSync(join(salida, '.nojekyll'), '');

for (const [antigua, nueva] of Object.entries(REDIRECCIONES)) {
  const destino = `${BASE}${nueva}`;
  const pagina = `<!doctype html>
<html lang="es-CO">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <meta http-equiv="refresh" content="0; url=${destino}" />
    <link rel="canonical" href="${destino}" />
    <title>Mente al Día</title>
  </head>
  <body>
    <p>Esta página cambió de dirección: <a href="${destino}">ir a Mente al Día</a>.</p>
  </body>
</html>
`;
  const archivo = antigua.endsWith('.html')
    ? join(salida, antigua)
    : join(salida, antigua, 'index.html');
  mkdirSync(dirname(archivo), { recursive: true });
  writeFileSync(archivo, pagina);
}

console.log(
  `Lista en dist-pages/ (${RUTAS.length} rutas, ${Object.keys(REDIRECCIONES).length} redirecciones). ` +
    (conBaseDeDatos
      ? 'Conectada a Supabase.'
      : 'Sin Supabase: el resultado se calcula en el navegador y no se guarda.'),
);
