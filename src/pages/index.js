/**
 * Page object registry.
 *
 * Registering a page here is the ONLY wiring a new page needs: the `pages`
 * fixture exposes it as `pages.<camelCaseClassName>` in every test.
 */
import { LoginPage } from './LoginPage.js';
import { RegistrationPage } from './RegistrationPage.js';
import { DashboardPage } from './DashboardPage.js';

export const pageObjects = {
  LoginPage,
  RegistrationPage,
  DashboardPage,
};

export { LoginPage, RegistrationPage, DashboardPage };
