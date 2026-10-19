import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      // El motor exige 100 % de ramas (Fase 2).
      include: ['src/lib/motor-resultados/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      thresholds: { branches: 100, functions: 100, lines: 100, statements: 100 },
      reporter: ['text'],
    },
  },
});
