/**
 * Condition-based waiting and retrying.
 * Prefer Playwright's built-in auto-waiting; use these only for conditions
 * Playwright cannot express (polling an API, waiting for a job to finish...).
 */
import { RETRY, TIMEOUTS } from '../constants/timeouts.js';
import { logger } from './logger.js';

/** Non-blocking sleep. Use sparingly - a real condition is almost always better. */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Polls until the condition returns a truthy value or the timeout elapses.
 * @returns the truthy value returned by the condition.
 */
export async function waitFor(condition, options = {}) {
  const {
    timeout = TIMEOUTS.MEDIUM,
    interval = 250,
    message = 'condition to be met',
    log = logger,
  } = options;

  const deadline = Date.now() + timeout;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const result = await condition();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await sleep(interval);
  }

  log.error(`Timed out after ${timeout}ms waiting for ${message}`, lastError);
  throw new Error(
    `Timed out after ${timeout}ms waiting for ${message}.${lastError ? ` Last error: ${lastError.message}` : ''}`
  );
}

/**
 * Retries an async action with exponential backoff.
 * shouldRetry() lets callers opt out for non-retryable failures (e.g. HTTP 4xx).
 */
export async function retry(action, options = {}) {
  const {
    attempts = RETRY.attempts,
    delayMs = RETRY.delayMs,
    backoffFactor = RETRY.backoffFactor,
    shouldRetry = () => true,
    description = 'operation',
    log = logger,
  } = options;

  let delay = delayMs;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await action(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !shouldRetry(error, attempt)) break;
      log.warn(
        `Attempt ${attempt}/${attempts} of ${description} failed: ${error.message}. Retrying in ${delay}ms.`
      );
      await sleep(delay);
      delay *= backoffFactor;
    }
  }

  throw new Error(`${description} failed after ${attempts} attempt(s): ${lastError?.message}`, {
    cause: lastError,
  });
}

/** Waits until a locator stops moving - useful after animations or lazy layout shifts. */
export async function waitForStable(locator, { timeout = TIMEOUTS.SHORT, interval = 100 } = {}) {
  let previous = null;
  return waitFor(
    async () => {
      const box = await locator.boundingBox();
      if (!box) return false;
      const current = `${box.x}:${box.y}:${box.width}:${box.height}`;
      const stable = previous === current;
      previous = current;
      return stable;
    },
    { timeout, interval, message: 'element position to stabilise' }
  );
}
