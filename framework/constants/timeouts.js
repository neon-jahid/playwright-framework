/** Named waits so tests never contain magic numbers. */
export const TIMEOUTS = Object.freeze({
  INSTANT: 1_000,
  SHORT: 5_000,
  MEDIUM: 15_000,
  LONG: 30_000,
  EXTRA_LONG: 60_000,
});

/** Default retry policy for flaky-by-nature operations (network, animations). */
export const RETRY = Object.freeze({
  attempts: 3,
  delayMs: 500,
  backoffFactor: 2,
});
