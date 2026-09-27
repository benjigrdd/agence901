import { defineConfig, devices } from '@playwright/test';

/**
 * Tests E2E contre Supabase LOCAL (pnpm db:start && pnpm db:reset && pnpm db:seed).
 * Cles locales par defaut de la CLI Supabase : publiques, identiques sur tous les postes, jamais en production.
 */
const PORT = Number(process.env.E2E_SUPABASE_PORT ?? 3200);
const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const env = {
  DATA_SOURCE: 'supabase',
  NEXT_DIST_DIR: '.next/supabase',
  NEXT_PUBLIC_SUPABASE_URL: LOCAL_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: LOCAL_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${PORT}`,
};

export default defineConfig({
  testDir: './e2e-supabase',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://127.0.0.1:${PORT}`, locale: 'fr-FR', timezoneId: 'Europe/Paris', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/connexion`,
    reuseExistingServer: !process.env.CI,
    // `pnpm start` ne relaie pas toujours SIGTERM a Next : arret explicite en fin de suite.
    gracefulShutdown: { signal: 'SIGINT', timeout: 2000 },
    timeout: 300_000,
    env,
  },
});
