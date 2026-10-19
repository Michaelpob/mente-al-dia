import { defineConfig, devices } from '@playwright/test';

const PORT = 4317;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Pocos procesos a la vez: el equipo de desarrollo es modesto.
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    { name: 'movil', use: { ...devices['Pixel 7'] } },
  ],
  // Compila la build de pruebas y levanta un servidor temporal; Playwright lo cierra al terminar.
  webServer: {
    command: 'corepack pnpm build:pruebas && corepack pnpm preview',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
