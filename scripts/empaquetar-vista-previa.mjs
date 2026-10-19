// Une la build de vista previa (dist-vista-previa/) en un único HTML para publicarlo como
// Artifact de claude.ai. El visor envuelve la página en su propio <html>/<head>/<body> y solo
// admite CSS y JS incrustados, así que aquí se incrusta todo.
// Uso: pnpm build:vista-previa  → dist-vista-previa/mente-al-dia.html
import { readFileSync, writeFileSync } from 'node:fs';

const carpeta = new URL('../dist-vista-previa/', import.meta.url);
const html = readFileSync(new URL('index.html', carpeta), 'utf8');

const rutaJs = html.match(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"/)?.[1];
const rutaCss = html.match(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"/)?.[1];
if (!rutaJs || !rutaCss) throw new Error('No se encontraron el JS y el CSS en index.html.');

// Evita que el contenido cierre antes de tiempo las etiquetas <script> y <style>.
const js = readFileSync(new URL(rutaJs, carpeta), 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(new URL(rutaCss, carpeta), 'utf8').replace(/<\/style/gi, '<\\/style');
const noscript = html.match(/<noscript>[\s\S]*?<\/noscript>/)?.[0] ?? '';
const descripcion = html.match(/<meta\s+name="description"\s+content="([^"]*)"/)?.[1] ?? '';

const pagina = `<title>Mente al Día</title>
<meta name="description" content="${descripcion}" />
<style>${css}</style>
<style>
  /* El visor aplica estilos base sin capa (body a 14 px con la fuente del sistema), que ganan
     a las capas de Tailwind: se reponen aquí la fuente y el fondo del sitio. */
  body {
    margin: 0;
    font-family: var(--fuente-cuerpo);
    font-size: var(--text-cuerpo);
    line-height: 1.6;
    background-color: var(--piedra-50);
    color: var(--grafito-900);
  }
</style>
<script>document.documentElement.lang = 'es-CO';</script>
${noscript}
<div id="root"></div>
<script type="module">${js}</script>
`;

const destino = new URL('mente-al-dia.html', carpeta);
writeFileSync(destino, pagina);
console.log(
  `Vista previa lista: dist-vista-previa/mente-al-dia.html (${(pagina.length / 1024).toFixed(0)} KB)`,
);
