import { defineConfig, devices } from '@playwright/test';
import { getConfig } from './framework/config/environment.js';
import { PATHS } from './framework/utils/paths.js';

/**
 * Every value comes from config/environments/.env.<TEST_ENV> (see
 * framework/config/environment.js), so switching environment never means
 * editing this file:  TEST_ENV=staging npm test
 */
const config = getConfig();

/** Shared browser context options - kept in one place for all projects. */
const sharedUse = {
  baseURL: config.baseURL,
  headless: config.headless,
  viewport: { width: 1440, height: 900 },
  actionTimeout: config.timeouts.action,
  navigationTimeout: config.timeouts.navigation,
  ignoreHTTPSErrors: config.ignoreHTTPSErrors,
  testIdAttribute: config.testIdAttribute,
  acceptDownloads: true,
  launchOptions: { slowMo: config.slowMo },

  // Failure diagnostics: captured only when something goes wrong, so passing
  // runs stay fast and artifacts stay small.
  screenshot: { mode: 'only-on-failure', fullPage: true },
  video: 'retain-on-failure',
  trace: config.isCI ? 'on-first-retry' : 'retain-on-failure',
};

export default defineConfig({
  testDir: './tests',
  outputDir: PATHS.artifacts,

  // Parallelism: files run in parallel across workers, and tests inside a file
  // run in parallel too. Use test.describe.serial() for order-dependent specs.
  fullyParallel: true,
  workers: config.workers,
  retries: config.retries,

  timeout: config.timeouts.test,
  expect: { timeout: config.timeouts.expect },

  forbidOnly: config.isCI,
  reportSlowTests: { max: 5, threshold: 30_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: PATHS.htmlReport, open: config.isCI ? 'never' : 'on-failure' }],
    ['json', { outputFile: `${PATHS.jsonReport}/results.json` }],
    ['junit', { outputFile: `${PATHS.junitReport}/results.xml` }],
    ...(config.isCI ? [['github']] : []),
  ],

  use: sharedUse,

  projects: [
    // Signs in once per run and stores the session in .auth/<env>-<role>.json.
    {
      name: 'setup',
      testDir: './tests/setup',
      testMatch: /.*\.setup\.js/,
    },

    // --- UI projects ---------------------------------------------------------
    {
      name: 'chromium',
      testDir: './tests/ui',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      testDir: './tests/ui',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      testDir: './tests/ui',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      testDir: './tests/ui',
      use: { ...devices['Pixel 7'] },
      dependencies: ['setup'],
    },

    // --- API project ---------------------------------------------------------
    // No browser, no auth setup: fast feedback for contract/data checks.
    {
      name: 'api',
      testDir: './tests/api',
    },
  ],
});
