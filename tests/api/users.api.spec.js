/**
 * Example API spec - runs in the `api` project (no browser, no auth setup).
 *
 * The `api` fixture is an ApiClient bound to API_BASE_URL; UserService keeps
 * endpoints and payloads out of the test.
 */
import { test, expect } from '../../src/fixtures.js';
import { UserService } from '../../src/api/index.js';

test.describe('Users API', { tag: ['@api', '@smoke'] }, () => {
  /** @type {UserService} */
  let users;

  test.beforeEach(async ({ api }) => {
    users = new UserService(api);
  });

  test('returns a list of users', async () => {
    const response = await users.listUsers();

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  test('returns a single user', async () => {
    const response = await users.getUser(1);

    expect(response.body).toMatchObject({ id: 1 });
    expect(response.body.email).toBeTruthy();
  });

  test('creates a user', { tag: '@regression' }, async ({ data }) => {
    const payload = data.user();

    const response = await users.createUser({ name: payload.fullName, email: payload.email });

    expect([200, 201]).toContain(response.status);
    expect(response.body).toMatchObject({ email: payload.email });
  });

  test('reports a helpful failure for a missing user', async ({ api }) => {
    const response = await api.get('/users/999999');

    expect(response.status).toBe(404);
  });
});
