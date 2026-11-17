import { defineConfig, devices } from '@playwright/test'

/** Port for the app under test. Set E2E_PORT to run several checkouts side by side. */
const port = Number(process.env.E2E_PORT ?? 5174)

/**
 * Browser tests for the screens. They run against the app with its demo data
 * today; the same tests become the acceptance tests once a real backend is
 * behind `src/data/api`. Each test gets a fresh browser profile, so it always
 * starts from the seed data.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `pnpm exec vite --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
