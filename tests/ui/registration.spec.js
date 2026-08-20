/** Example spec using generated data - every run registers a unique user. */
import { test } from '../../src/fixtures.js';
import { messages, registrationData } from '../../src/data/index.js';
import { anonymousState } from '../../framework/index.js';

test.use({ storageState: anonymousState });

test.describe('Registration', { tag: ['@regression'] }, () => {
  test.beforeEach(async ({ pages }) => {
    await pages.registrationPage.goto();
  });

  // `newUser` is the project fixture defined in src/fixtures.js.
  test('a new user can register', { tag: '@smoke' }, async ({ pages, newUser }) => {
    await pages.registrationPage.register(newUser);

    await pages.registrationPage.expectRegistrationSucceeded();
  });

  test('mismatched passwords are rejected', async ({ pages, data }) => {
    const user = registrationData(data, { confirmPassword: 'DoesNotMatch123!' });

    await pages.registrationPage.register(user);

    await pages.registrationPage.expectRegistrationFailed(messages.registration.passwordMismatch);
  });
});
