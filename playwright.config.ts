import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E test configuration for style-atelier Chrome Extension.
 * Ref: https://playwright.dev/docs/chrome-extensions
 */
export default defineConfig({
  testDir: "./tests/e2e",
  /* Maximum time one test can run for. */
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  /* Run tests in files in parallel */
  fullyParallel: false, // Keep serial for extension state/storage isolation if needed
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "list",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:8080",
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Extension testing only works in Chromium
      },
    },
  ],

  /* Run local dev server before starting the tests */
  webServer: {
    command: "npx http-server ./tests/fixtures -p 8080",
    port: 8080,
    reuseExistingServer: !process.env.CI,
    timeout: 10 * 1000,
  },
});
