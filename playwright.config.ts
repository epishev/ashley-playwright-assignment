import { defineConfig, devices } from '@playwright/test';

const UI_BASE_URL = process.env.UI_BASE_URL ?? 'https://qa.awarasleep.com';
const API_BASE_URL = process.env.API_BASE_URL ?? 'https://api.qa-env.residenthome.com';
const isCI = !!process.env.CI;
// The assignment's name for test traffic, sent by both the browser and the API client.
const TEST_USER_AGENT = 'E2EUI-Tests';

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  // A UI test takes 10-16 s on a developer machine. Choosing the size alone may wait up to 45 s for the page's
  // pricing requests (MattressPage.selectSize), so 90 s leaves room for the page loads and the cart check.
  timeout: 90_000,
  // The site opens the cart only after it has saved the item; the flow still passes with the save delayed by 8 s.
  expect: { timeout: 15_000 },
  // Allure is the only report. It keeps the error, screenshot, error context and trace of a failed test.
  reporter: [['list'], ['allure-playwright', { detail: false }]],
  use: {
    // In CI traces the slowest click took 2.1 s and the slowest page load 1.0 s.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // Traces are most of the report size. One per failing test is enough: a failed retry still keeps its
    // error and screenshot. The filmstrip is left out; DOM snapshots, network and console stay.
    trace: { mode: 'retain-on-first-failure', screenshots: false },
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'ui',
      testMatch: 'ui/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        // Must come after the device spread, which sets its own User-Agent.
        userAgent: TEST_USER_AGENT,
        baseURL: UI_BASE_URL,
      },
    },
    {
      name: 'api',
      testMatch: 'api/**/*.spec.ts',
      use: { userAgent: TEST_USER_AGENT, baseURL: API_BASE_URL },
    },
  ],
});
