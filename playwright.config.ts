import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  use: { baseURL: 'http://localhost:3000', trace: 'off', ...devices['Desktop Chrome'] },
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 180000,
  },
  reporter: 'list',
});
