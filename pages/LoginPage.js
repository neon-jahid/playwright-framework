class LoginPage {
    constructor(page) {
        this.page = page;

        // Locators
        this.username = page.getByPlaceholder('Enter your phone number or email');
        this.password = page.locator('input[type="password"]');
        this.loginBtn = page.locator(':text("LOG IN")');
        this.errorMsg = page.locator('.error-message');
    }

    // Navigate to login page
    async goto() {
        await this.page.goto('/login');
    }

    // Perform login
    async login(user, pass) {
        await this.username.fill(user);
        await this.password.fill(pass);
        await this.loginBtn.click();
    }

    // Assertion method (VERY IMPORTANT)
    async verifyLoginSuccess() {
        await this.page.waitForURL(/dashboard/);
    }

    // Negative case
    async verifyLoginFailure() {
        await this.errorMsg.waitFor();
    }
}

module.exports = { LoginPage };
