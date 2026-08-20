/**
 * Environment/config management.
 *
 * Resolution order (later wins):
 *   1. config/environments/.env.<env>
 *   2. config/environments/.env.<env>.local
 *   3. config/environments/.env.local
 *   4. real process environment variables (CI secrets) - always highest priority
 *
 * The result is a single frozen, validated config object consumed by
 * playwright.config.js, fixtures and helpers. Nothing else should read
 * `process.env` directly.
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { PATHS } from '../utils/paths.js';

export const SUPPORTED_ENVIRONMENTS = ['dev', 'staging', 'prod'];

/** Variables a project cannot run without. Extend per project if needed. */
const REQUIRED_VARIABLES = ['BASE_URL'];

let cachedConfig = null;

const parseEnvFile = (filePath) => (fs.existsSync(filePath) ? dotenv.parse(fs.readFileSync(filePath)) : {});

const toBoolean = (value, fallback = false) =>
  value === undefined || value === ''
    ? fallback
    : ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return value === undefined || value === '' || Number.isNaN(parsed) ? fallback : parsed;
};

const toOptional = (value) => (value === undefined || value === '' ? undefined : value);

/** `SUPER_ADMIN` -> `superAdmin` */
const toCamelCase = (value) =>
  value
    .toLowerCase()
    .split('_')
    .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');

function resolveEnvironmentName() {
  const name = String(process.env.TEST_ENV || process.env.ENV || 'dev').toLowerCase();
  if (!SUPPORTED_ENVIRONMENTS.includes(name)) {
    throw new Error(
      `Unknown TEST_ENV "${name}". Supported environments: ${SUPPORTED_ENVIRONMENTS.join(', ')}.`
    );
  }
  return name;
}

function loadDotEnvFiles(environmentName) {
  const merged = {
    ...parseEnvFile(path.join(PATHS.environments, `.env.${environmentName}`)),
    ...parseEnvFile(path.join(PATHS.environments, `.env.${environmentName}.local`)),
    ...parseEnvFile(path.join(PATHS.environments, '.env.local')),
  };

  // Never clobber real environment variables: CI secrets must win over files.
  for (const [key, value] of Object.entries(merged)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return process.env;
}

/**
 * Discovers credentials by convention: `<ROLE>_USERNAME` + `<ROLE>_PASSWORD`.
 * Adding a new role to a project therefore needs zero code changes.
 */
function collectUsers(env) {
  const users = {};
  for (const key of Object.keys(env)) {
    const match = /^([A-Z0-9_]+)_USERNAME$/.exec(key);
    if (!match) continue;
    const role = toCamelCase(match[1]);
    users[role] = Object.freeze({
      role,
      username: env[key],
      password: env[`${match[1]}_PASSWORD`] ?? '',
    });
  }
  return Object.freeze(users);
}

function validate(env, environmentName) {
  const missing = REQUIRED_VARIABLES.filter((key) => !toOptional(env[key]));
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s) [${missing.join(', ')}] for TEST_ENV="${environmentName}".\n` +
        `Add them to config/environments/.env.${environmentName} (or .env.local), or export them in CI.`
    );
  }
}

function buildConfig() {
  const environment = resolveEnvironmentName();
  const env = loadDotEnvFiles(environment);
  validate(env, environment);

  const isCI = toBoolean(env.CI, false);

  return Object.freeze({
    environment,
    isCI,

    baseURL: env.BASE_URL,
    apiBaseURL: toOptional(env.API_BASE_URL) ?? env.BASE_URL,
    apiToken: toOptional(env.API_TOKEN),

    users: collectUsers(env),
    authMaxAgeMinutes: toNumber(env.AUTH_MAX_AGE_MINUTES, 60),
    forceAuthRefresh: toBoolean(env.FORCE_AUTH_REFRESH, false),

    headless: toBoolean(env.HEADLESS, true) && !toBoolean(env.HEADED, false),
    slowMo: toNumber(env.SLOW_MO, 0),
    ignoreHTTPSErrors: toBoolean(env.IGNORE_HTTPS_ERRORS, false),
    testIdAttribute: env.TEST_ID_ATTRIBUTE || 'data-testid',

    // `undefined` lets Playwright apply its own default.
    workers: toOptional(env.WORKERS) ?? (isCI ? '50%' : undefined),
    retries: toNumber(env.RETRIES, isCI ? 2 : 0),

    timeouts: Object.freeze({
      test: toNumber(env.TEST_TIMEOUT_MS, 60_000),
      expect: toNumber(env.EXPECT_TIMEOUT_MS, 10_000),
      action: toNumber(env.ACTION_TIMEOUT_MS, 15_000),
      navigation: toNumber(env.NAVIGATION_TIMEOUT_MS, 30_000),
    }),

    logLevel: env.LOG_LEVEL || (isCI ? 'info' : 'debug'),
    logToFile: toBoolean(env.LOG_TO_FILE, true),

    paths: PATHS,
  });
}

/** Returns the (cached) validated configuration for the active environment. */
export function getConfig() {
  if (!cachedConfig) cachedConfig = buildConfig();
  return cachedConfig;
}

/** Returns credentials for a role, with a helpful error when they are missing. */
export function getUser(role = 'standard') {
  const { users, environment } = getConfig();
  const user = users[role];
  if (!user?.username) {
    throw new Error(
      `No credentials for role "${role}" in TEST_ENV="${environment}". ` +
        `Define ${role.toUpperCase()}_USERNAME and ${role.toUpperCase()}_PASSWORD. ` +
        `Known roles: ${Object.keys(users).join(', ') || 'none'}.`
    );
  }
  return user;
}

/** Test-only helper: forces the next getConfig() call to re-read the environment. */
export function resetConfigCache() {
  cachedConfig = null;
}
