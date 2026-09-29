import { defineConfig, devices } from '@playwright/test';

// Build de production sur un port dedie : pas de compilation a la volee pendant les tests.
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}/connexion`,
    reuseExistingServer: !process.env.CI,
    // `pnpm start` ne relaie pas toujours SIGTERM a Next : arret explicite en fin de suite.
    gracefulShutdown: { signal: 'SIGINT', timeout: 2000 },
    timeout: 300_000,
    // Build de production sur le mock : autorisation explicite (voir src/lib/data-source.ts).
    env: { DATA_SOURCE: 'mock', ALLOW_MOCK_DATA: '1' },
  },
});
