# Mente al Día

Plataforma web de orientación y bienestar emocional de la Alcaldía de [MUNICIPIO], liderada por [SECRETARÍA RESPONSABLE].

Es una página web responsiva (no es una app nativa ni una APK). Ofrece orientación y no reemplaza la atención profesional ni los servicios de emergencia.

> Estado: **Fase 1 · Fundaciones y sistema de diseño.** Las demás pantallas se construyen por fases (ver `docs/`).

## Requisitos

- Node.js 24 o superior.
- pnpm (incluido en Node mediante corepack: `corepack pnpm …`).

## Scripts

| Comando                       | Qué hace                                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm install`       | Instala las dependencias.                                                                                       |
| `corepack pnpm dev`           | Servidor de desarrollo (incluye `/guia-de-estilo`).                                                             |
| `corepack pnpm build`         | Build de producción (sin guía de estilo).                                                                       |
| `corepack pnpm build:pruebas` | Build de pruebas: igual que producción, pero con `/guia-de-estilo`.                                             |
| `corepack pnpm typecheck`     | Verificación de tipos de TypeScript (modo estricto).                                                            |
| `corepack pnpm lint`          | ESLint (incluye reglas de accesibilidad jsx-a11y), sin advertencias permitidas.                                 |
| `corepack pnpm format`        | Formatea el código con Prettier.                                                                                |
| `corepack pnpm contraste`     | Verifica el contraste AA de todos los pares de color de los tokens.                                             |
| `corepack pnpm test:e2e`      | Pruebas de Playwright + axe. Compila la build de pruebas, levanta un servidor temporal y lo cierra al terminar. |

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
docs/           DECISIONES.md, PENDIENTES_VALIDACION.md
e2e/            pruebas de Playwright
scripts/        verificador de contraste
```

## Sistema visual

- **Tokens:** todos están en `src/styles/tokens.css`. Para aplicar un manual de marca se cambian los valores de «Marca» ahí, sin tocar componentes, y luego se ejecuta `corepack pnpm contraste`.
- **Datos de la Alcaldía:** los marcadores (`[MUNICIPIO]`, `[LOGO ALCALDÍA]`, contacto, GOV.CO) están en `src/config/sitio.ts`.
- **Textos de interfaz:** están centralizados en `src/content/textos-interfaz.ts`.

## Variables de entorno

Copia `.env.example` como `.env.local`. Nunca pongas la service role key de Supabase en el navegador: solo va en las Edge Functions (Fase 4).
