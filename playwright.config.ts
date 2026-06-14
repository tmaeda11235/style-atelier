import { execSync } from "child_process"
import path from "path"
import { defineConfig, devices } from "@playwright/test"

const getFreePort = () => {
  if (process.env.TEST_PORT) return process.env.TEST_PORT
  try {
    const port = execSync("node scratch/get-free-port.js", {
      encoding: "utf-8"
    }).trim()
    process.env.TEST_PORT = port
    return port
  } catch {
    console.warn("Failed to dynamically allocate port. Falling back to 5173.")
    process.env.TEST_PORT = "5173"
    return "5173"
  }
}

const PORT = getFreePort()

/**
 * Playwright E2E test configuration for style-atelier Chrome Extension.
 * Ref: https://playwright.dev/docs/chrome-extensions
 */
export default defineConfig({
  testDir: "./tests/e2e",
  /* Maximum time one test can run for. */
  timeout: 60 * 1000,
  expect: {
    timeout: 10000
  },
  /* Run tests sequentially to reduce machine load and flakes */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [["list"], ["./tests/e2e/VerboseReporter.ts"]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: `http://localhost:${PORT}`,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    /* Capture screenshot after each test. */
    screenshot: "on",
    /* Record video only when a test fails. */
    video: "off"
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 }
      }
    },
    {
      name: "extension",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
        headless: false,
        args: [
          `--disable-extensions-except=${path.resolve(__dirname, "build/chrome-mv3-prod")}`,
          `--load-extension=${path.resolve(__dirname, "build/chrome-mv3-prod")}`,
          "--no-sandbox",
          "--disable-setuid-sandbox"
        ]
      }
    }
  ],

  /* Run local dev server before starting the tests */
  webServer: {
    command: `"${process.execPath}" ./node_modules/vite/bin/vite.js --config tests/sandbox/vite.config.ts --port ${PORT} --strictPort`,
    port: Number(PORT),
    reuseExistingServer: false,
    timeout: 60 * 1000
  }
})
