/**
 * Project-level test entry point. Every spec imports `test` and `expect`
 * from here.
 *
 * It binds this project's page objects to the generic framework fixtures and is
 * the place to add project-specific fixtures (a seeded shopping cart, a feature
 * flag toggle, a tenant...). Keep generic helpers in framework/ instead.
 */
import { withPageObjects, expect } from '../framework/index.js';
import { pageObjects } from './pages/index.js';
import { registrationData } from './data/users.js';

export const test = withPageObjects(pageObjects).extend({
  // Example of a project-specific fixture: fresh, unique registration data per
  // test, already in the shape this application's sign-up form expects.
  newUser: async ({ data }, use) => {
    await use(registrationData(data));
  },
});

export { expect };
