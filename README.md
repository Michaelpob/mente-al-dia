# Mente al Día

Plataforma web de orientación y bienestar emocional de la Alcaldía de [MUNICIPIO], liderada por [SECRETARÍA RESPONSABLE].

Es una página web responsiva (no es una app nativa ni una APK). Ofrece orientación y no reemplaza la atención profesional ni los servicios de emergencia.

> Estado: **Fases 0 a 7 terminadas** (fundaciones, sistema de diseño, contenido del instrumento, motor de resultados, página de inicio con el orbe 3D, base de datos con permisos por rol, ingreso con doble factor, cálculo oficial en el servidor y auditoría, registro y cuestionario conectados al servidor, y resultados por área con rueda de bienestar y versión imprimible). Las demás pantallas se construyen por fases (ver `docs/`). La puesta en marcha de Supabase está en `docs/BASE_DE_DATOS.md`.

## Sitio publicado

**https://michaelpob.github.io/mente-al-dia/**

Es la plataforma real (la app de `src/`), la misma para todo el que entre: sitio público con el orbe 3D, registro, cuestionario de adultos y de niñas y niños, resultados y panel de administración. No hay una demostración aparte (D-66).

- Se publica con GitHub Pages desde la rama `gh-pages`. Para actualizarla: `corepack pnpm pages:preparar` (compila con la base `/mente-al-dia/`, copia `index.html` en cada ruta y crea redirecciones desde las direcciones antiguas) y se publica el contenido de `dist-pages/` en `gh-pages`.
- **Está conectada a Supabase** (proyecto `mente-al-dia`, valores en `.env.production`, D-67): el registro y el resultado se guardan en el servidor y el panel pide el correo y la contraseña del administrador, con doble factor (ver `docs/BASE_DE_DATOS.md`).
- El panel es solo para el administrador (D-65).
- GitHub Pages no permite configurar todos los encabezados de seguridad de la Fase 10 (ver F1-08 en `docs/PENDIENTES_VALIDACION.md`).

## Requisitos

- Node.js 24 o superior.
- pnpm (incluido en Node mediante corepack: `corepack pnpm …`).

## Scripts

| Comando                               | Qué hace                                                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm install`               | Instala las dependencias.                                                                                             |
| `corepack pnpm dev`                   | Servidor de desarrollo (incluye `/guia-de-estilo`).                                                                   |
| `corepack pnpm build`                 | Build de producción (sin guía de estilo).                                                                             |
| `corepack pnpm build:pruebas`         | Build de pruebas: igual que producción, pero con `/guia-de-estilo`.                                                   |
| `corepack pnpm build:vista-previa`    | Vista previa en un solo HTML (`dist-vista-previa/mente-al-dia.html`) para publicar como Artifact de claude.ai.        |
| `corepack pnpm typecheck`             | Verificación de tipos de TypeScript (modo estricto).                                                                  |
| `corepack pnpm lint`                  | ESLint (incluye reglas de accesibilidad jsx-a11y), sin advertencias permitidas.                                       |
| `corepack pnpm format`                | Formatea el código con Prettier.                                                                                      |
| `corepack pnpm contraste`             | Verifica el contraste AA de todos los pares de color de los tokens.                                                   |
| `corepack pnpm pages:preparar`        | Compila el sitio publicado en `dist-pages/` para la rama `gh-pages` (D-66).                                           |
| `corepack pnpm funciones:sincronizar` | Copia el motor y el contenido a las Edge Functions de Supabase (`supabase/functions/_compartido/generado`).           |
| `corepack pnpm test:funciones`        | Comprueba esas copias, el tipado de las Edge Functions y sus pruebas (Deno).                                          |
| `corepack pnpm test:bd`               | Migraciones y pruebas de permisos y auditoría en un PostgreSQL local (`BD_PRUEBAS_URL`, ver `docs/BASE_DE_DATOS.md`). |
| `corepack pnpm test:e2e`              | Pruebas de Playwright + axe. Compila la build de pruebas, levanta un servidor temporal y lo cierra al terminar.       |

## Estructura

```text
src/
  app/          rutas, layouts (público y panel) y proveedores
  components/   ui/ (componentes base), layout/ (encabezado, pie, accesibilidad), brand/ (logos)
  features/     una carpeta por sección (inicio, registro, cuestionario, resultados, panel, guía de estilo…)
  content/      textos de interfaz y contenido versionado (líneas de ayuda; el instrumento llega en la Fase 2)
  config/       datos institucionales del cliente (marcadores entre corchetes)
  lib/          utilidades y preferencias de accesibilidad
  hooks/  styles/  types/
supabase/       migraciones, pruebas pgTAP y Edge Functions (Fase 4)
docs/           DECISIONES.md, PENDIENTES_VALIDACION.md, BASE_DE_DATOS.md
e2e/            pruebas de Playwright
scripts/        verificador de contraste, generador de contenido y publicación en GitHub Pages
```

## Sistema visual

- **Tokens:** todos están en `src/styles/tokens.css`. Para aplicar un manual de marca se cambian los valores de «Marca» ahí, sin tocar componentes, y luego se ejecuta `corepack pnpm contraste`.
- **Datos de la Alcaldía:** los marcadores (`[MUNICIPIO]`, `[LOGO ALCALDÍA]`, contacto, GOV.CO) están en `src/config/sitio.ts`.
- **Textos de interfaz:** están centralizados en `src/content/textos-interfaz.ts`.

## Variables de entorno

Copia `.env.example` como `.env.local`. Nunca pongas la service role key de Supabase en el navegador: solo va en las Edge Functions (Fase 4).
