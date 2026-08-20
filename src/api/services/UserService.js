/**
 * Example API service.
 *
 * Services wrap endpoints the same way page objects wrap pages: tests talk
 * business language, the service owns paths, payloads and status expectations.
 */
export class UserService {
  /** @param {import('../../../framework/api/ApiClient.js').ApiClient} api */
  constructor(api) {
    this.api = api;
    this.resource = '/users';
  }

  listUsers(params = {}) {
    return this.api.get(this.resource, { params, expectStatus: 200 });
  }

  getUser(id) {
    return this.api.get(`${this.resource}/${id}`, { expectStatus: 200 });
  }

  createUser(payload) {
    return this.api.post(this.resource, { data: payload, expectStatus: [200, 201] });
  }

  updateUser(id, payload) {
    return this.api.put(`${this.resource}/${id}`, { data: payload, expectStatus: 200 });
  }

  deleteUser(id) {
    return this.api.delete(`${this.resource}/${id}`, { expectStatus: [200, 202, 204] });
  }
}
