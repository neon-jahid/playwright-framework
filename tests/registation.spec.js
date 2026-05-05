const { test } = require('@playwright/test');
const { RegistrationPage } = require('../pages/RegistrationPage');
const users = require('../test-data/users.json');

test.describe('Registration Tests', () => {
    test('new user can register successfully', async ({ page }) => {
        const registrationPage = new RegistrationPage(page);

        await registrationPage.goto();

        await registrationPage.register(users.newUser.firstName, users.newUser.lastName, users.newUser.email, users.newUser.password, users.newUser.confirmPassword);

        await registrationPage.verifyRegistrationSuccess();
    });

    test('user cannot register with password mismatch', async ({ page }) => {
        const registrationPage = new RegistrationPage(page);

        await registrationPage.goto();

        await registrationPage.register(users.newUser.firstName, users.newUser.lastName, `test_${Date.now()}@example.com`, users.newUser.password, 'WrongPassword123');

        await registrationPage.verifyRegistrationFailure();
    });
});
