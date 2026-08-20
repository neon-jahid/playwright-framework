/**
 * Thin, logged wrapper around Playwright's APIRequestContext.
 *
 * Used for API tests and, more often, for fast test setup/teardown
 * (create the record via API, verify it in the UI).
 */
import { logger as rootLogger } from '../utils/logger.js';
import { retry } from '../utils/waitUtils.js';

const RETRYABLE_STATUSES = [408, 429, 500, 502, 503, 504];

export class ApiClient {
  /**
   * @param {import('@playwright/test').APIRequestContext} requestContext
   * @param {{ baseURL?: string, token?: string, logger?: object, headers?: object }} [options]
   */
  constructor(requestContext, options = {}) {
    this.request = requestContext;
    this.baseURL = options.baseURL;
    this.token = options.token;
    this.defaultHeaders = { Accept: 'application/json', ...options.headers };
    this.logger = (options.logger ?? rootLogger).child('ApiClient');
  }

  /** Sets/clears the bearer token used for subsequent calls. */
  withToken(token) {
    this.token = token;
    return this;
  }

  get(endpoint, options) {
    return this.send('GET', endpoint, options);
  }

  post(endpoint, options) {
    return this.send('POST', endpoint, options);
  }

  put(endpoint, options) {
    return this.send('PUT', endpoint, options);
  }

  patch(endpoint, options) {
    return this.send('PATCH', endpoint, options);
  }

  delete(endpoint, options) {
    return this.send('DELETE', endpoint, options);
  }

  /**
   * @param {string} method
   * @param {string} endpoint absolute URL or path relative to the API base URL
   * @param {{ data?: any, params?: object, headers?: object, form?: object,
   *           multipart?: object, timeout?: number, expectStatus?: number|number[],
   *           retries?: number }} [options]
   * @returns {Promise<{ status: number, ok: boolean, body: any, headers: object, url: string, durationMs: number }>}
   */
  async send(method, endpoint, options = {}) {
    const { expectStatus, retries = 1, ...requestOptions } = options;
    const url = this.resolveUrl(endpoint);

    const result = await retry(
      async () => {
        const startedAt = Date.now();
        const response = await this.request.fetch(url, {
          method,
          headers: this.buildHeaders(requestOptions.headers),
          ...requestOptions,
        });

        const payload = {
          status: response.status(),
          ok: response.ok(),
          headers: response.headers(),
          body: await this.parseBody(response),
          url,
          durationMs: Date.now() - startedAt,
        };

        this.logger.debug(`${method} ${url} -> ${payload.status} (${payload.durationMs}ms)`);

        if (RETRYABLE_STATUSES.includes(payload.status)) {
          throw Object.assign(new Error(`${method} ${url} failed with ${payload.status}`), { payload });
        }
        return payload;
      },
      {
        attempts: retries + 1,
        description: `${method} ${url}`,
        log: this.logger,
        shouldRetry: (error) => !error.payload || RETRYABLE_STATUSES.includes(error.payload.status),
      }
    ).catch((error) => {
      // Exhausted retries on a retryable status: return the response so the test
      // can assert on it instead of failing with an opaque error.
      if (error.cause?.payload) return error.cause.payload;
      throw error;
    });

    if (expectStatus !== undefined) this.assertStatus(result, expectStatus, method);
    return result;
  }

  /** Fails fast with the response body included - the detail you always want. */
  assertStatus(response, expected, method = 'request') {
    const allowed = Array.isArray(expected) ? expected : [expected];
    if (!allowed.includes(response.status)) {
      throw new Error(
        `Expected ${method} ${response.url} to return ${allowed.join(' or ')} but got ${response.status}.\n` +
          `Response body: ${JSON.stringify(response.body).slice(0, 1000)}`
      );
    }
    return response;
  }

  resolveUrl(endpoint) {
    if (/^https?:\/\//i.test(endpoint) || !this.baseURL) return endpoint;
    return `${this.baseURL.replace(/\/+$/, '')}/${String(endpoint).replace(/^\/+/, '')}`;
  }

  buildHeaders(extraHeaders = {}) {
    return {
      ...this.defaultHeaders,
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...extraHeaders,
    };
  }

  async parseBody(response) {
    const text = await response.text().catch(() => '');
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}
