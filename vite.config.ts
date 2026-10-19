import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  // Vista previa para Artifact de claude.ai: un solo JS y un solo CSS, con fuentes e imágenes
  // incrustadas, que scripts/empaquetar-vista-previa.mjs une en un único HTML.
  const vistaPrevia = mode === 'vista-previa';

  return {
    plugins: [react(), tailwindcss()],
    base: vistaPrevia ? './' : '/',
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      target: 'es2022',
      ...(vistaPrevia && {
        outDir: 'dist-vista-previa',
        assetsInlineLimit: () => true,
        cssCodeSplit: false,
        rollupOptions: { output: { inlineDynamicImports: true } },
      }),
    },
    preview: {
      port: 4317,
      strictPort: true,
    },
  };
});
