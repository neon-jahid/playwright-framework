/**
 * Authentication / session handling built on Playwright storageState.
 *
 * The login flow itself is project-specific, so it is injected as a callback:
 * the framework owns *where* and *when* state is stored, the project owns *how*
 * a user signs in. One storage state file is kept per environment + role.
 */
import path from 'node:path';
import { getConfig, getUser } from '../config/environment.js';
import { ensureDir, exists, fileAgeInMinutes, listFiles, readJson, removeFile } from '../utils/fileUtils.js';
import { PATHS } from '../utils/paths.js';
import { logger as rootLogger } from '../utils/logger.js';

const log = rootLogger.child('AuthManager');

/** Path of the storage state file for a role, e.g. .auth/dev-standard.json */
export function storageStatePath(role = 'standard') {
  const { environment } = getConfig();
  return path.join(PATHS.authState, `${environment}-${role}.json`);
}

/**
 * Use in a spec to run it as an authenticated user:
 *   test.use({ storageState: authState('admin') });
 */
export const authState = storageStatePath;

/** Empty session - use it to force a logged-out test. */
export const anonymousState = { cookies: [], origins: [] };

/** True when a stored session exists and is still within AUTH_MAX_AGE_MINUTES. */
export function isAuthStateFresh(role = 'standard') {
  const config = getConfig();
  if (config.forceAuthRefresh) return false;
  return fileAgeInMinutes(storageStatePath(role)) < config.authMaxAgeMinutes;
}

/**
 * Signs a role in through the UI and stores the session for later reuse.
 *
 * @param {object} params
 * @param {import('@playwright/test').Browser} params.browser
 * @param {string} params.role role name declared in the environment file
 * @param {(page: import('@playwright/test').Page, user: object) => Promise<void>} params.login
 * @param {boolean} [params.force] re-authenticate even if the state is fresh
 * @returns {Promise<string>} path of the storage state file
 */
export async function createAuthState({ browser, role = 'standard', login, force = false }) {
  const statePath = storageStatePath(role);

  if (!force && isAuthStateFresh(role)) {
    log.info(`Reusing session for role "${role}" (${statePath})`);
    return statePath;
  }

  const user = getUser(role);
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    log.step(`Authenticating role "${role}" as ${user.username}`);
    await login(page, user);
    ensureDir(PATHS.authState);
    await context.storageState({ path: statePath });
    log.info(`Session stored: ${statePath}`);
    return statePath;
  } catch (error) {
    log.error(`Authentication failed for role "${role}"`, error);
    throw error;
  } finally {
    await context.close();
  }
}

/**
 * Reads a token from a stored session so API tests can reuse the UI login.
 * @param {string} role
 * @param {{ key?: string }} [options] localStorage key holding the token
 */
export function tokenFromAuthState(role = 'standard', { key = 'token' } = {}) {
  const statePath = storageStatePath(role);
  if (!exists(statePath)) return undefined;
  const state = readJson(statePath);
  for (const origin of state.origins ?? []) {
    const entry = (origin.localStorage ?? []).find((item) => item.name === key);
    if (entry) return entry.value;
  }
  return undefined;
}

/** Deletes stored sessions (all roles, or one). */
export function clearAuthState(role) {
  if (role) {
    removeFile(storageStatePath(role));
    return;
  }
  listFiles(PATHS.authState, '.json').forEach(removeFile);
}
