const { test } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const users = require('../test-data/users.json');

test.describe('Login Tests', () => {
    test('valid user can login successfully', async ({ page }) => {
        const loginPage = new LoginPage(page);

        await loginPage.goto();

        await loginPage.login(users.validLoginUser.username, users.validLoginUser.password);

        await loginPage.verifyLoginSuccess();
    });

    test('invalid user cannot login', async ({ page }) => {
        const loginPage = new LoginPage(page);

        await loginPage.goto();

        await loginPage.login(users.invalidLoginUser.username, users.invalidLoginUser.password);

        await loginPage.verifyLoginFailure();
    });
});
