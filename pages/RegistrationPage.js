class RegistrationPage {
    constructor(page) {
        this.page = page;

        this.firstName = page.locator('#firstName');
        this.lastName = page.locator('#lastName');
        this.email = page.locator('#email');
        this.password = page.locator('#password');
        this.confirmPassword = page.locator('#confirmPassword');
        this.registerBtn = page.locator('button[type="submit"]');
        this.successMsg = page.locator('.success-message');
        this.errorMsg = page.locator('.error-message');
    }

    async goto() {
        await this.page.goto('/register');
    }

    async register(firstName, lastName, email, password, confirmPassword) {
        await this.firstName.fill(firstName);
        await this.lastName.fill(lastName);
        await this.email.fill(email);
        await this.password.fill(password);
        await this.confirmPassword.fill(confirmPassword);
        await this.registerBtn.click();
    }

    async verifyRegistrationSuccess() {
        await this.successMsg.waitFor();
    }

    async verifyRegistrationFailure() {
        await this.errorMsg.waitFor();
    }
}

module.exports = { RegistrationPage };
