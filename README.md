# Playwright Automation Framework

A reusable, scalable UI + API test framework built on [Playwright Test](https://playwright.dev):
page objects, dependency-injected fixtures, multi-environment configuration, session reuse and rich
failure diagnostics.

The `framework/` directory is application-agnostic — drop it into any project. Everything specific to
the application under test lives in `src/`, `tests/` and `config/environments/`.

---

## Quick start

```bash
npm install
npx playwright install --with-deps

cp config/environments/.env.example config/environments/.env.local   # your credentials
npm test                                    # all projects, TEST_ENV=dev
npm run test:smoke                          # only @smoke tagged tests
npm run test:chromium -- tests/ui/login.spec.js
npm run report                              # open the HTML report
```

`.env.local` is git-ignored — put real credentials there, never in `.env.dev`.

---

## Project structure

```
framework/            Reusable engine (no application knowledge)
├── api/ApiClient.js          Logged, retrying wrapper around APIRequestContext
├── auth/authManager.js       storageState creation, reuse and expiry per role
├── config/environment.js     Loads + validates .env.<env>, exposes one frozen config
├── core/
│   ├── UiActions.js          Every element interaction (click, fill, waits, assertions)
│   ├── BasePage.js           Navigation, downloads, dialogs, network stubbing
│   └── BaseComponent.js      Root-scoped reusable components
├── fixtures/                 config, logger, pages, data, api, loginAs fixtures
├── utils/                    logger, dataFactory, paths, files, waits, artifacts
└── index.js                  Public surface — import from here

src/                  This application's layer
├── pages/                    Page objects + components, registered in pages/index.js
├── api/services/             Endpoint wrappers (UserService, ...)
├── data/                     Static data and expected copy
└── fixtures.js               `test` / `expect` used by every spec

tests/
├── setup/auth.setup.js       Signs each role in once, stores the session
├── ui/                       Browser specs
└── api/                      API specs (no browser)

config/environments/  .env.dev | .env.staging | .env.prod | .env.example
assets/upload/        Files used by upload tests
scripts/clean.js      Removes generated output and stored sessions
reports/              html | json | junit | logs | screenshots | artifacts (git-ignored)
```

---

## Application under test

The example suite targets **letsvibebd.com** (`BASE_URL` in `config/environments/.env.dev`):

| Page      | Route        | Notes                                                           |
| --------- | ------------ | --------------------------------------------------------------- |
| Sign in   | `/signin`    | `username` accepts a phone number or an email address           |
| Sign up   | `/signup`    | full name, email, phone, date of birth, password + confirmation |
| Dashboard | `/dashboard` | redirects anonymous visitors to `/signin`                       |

Errors render inline as `p.text-red-500`; sign-up confirms with a react-toastify toast.

Credentials are intentionally empty in `.env.dev` — add real ones to
`config/environments/.env.local` to enable the authenticated specs. Until then the `setup` project
and every auth-dependent spec skip themselves rather than fail.

---

## Configuration

One file per environment; select it with `TEST_ENV`:

```bash
npm run test:dev        # or: cross-env TEST_ENV=staging npm test
npm run test:staging
npm run test:prod
```

Resolution order (later wins):

1. `config/environments/.env.<env>`
2. `config/environments/.env.<env>.local`
3. `config/environments/.env.local`
4. real environment variables — **CI secrets always win**

`framework/config/environment.js` validates the result (a missing `BASE_URL` fails fast with a
helpful message) and freezes it. Nothing else in the codebase reads `process.env`.

### Credentials by convention

Any `<ROLE>_USERNAME` / `<ROLE>_PASSWORD` pair is discovered automatically and exposed as
`config.users.<role>`. Adding a role needs **zero code changes**:

```dotenv
MANAGER_USERNAME=manager@example.com
MANAGER_PASSWORD=...
```

```js
test('manager sees the approvals tab', async ({ loginAs }) => {
  const page = await loginAs('manager'); // uses the stored manager session
});
```

---

## Writing a test

Specs describe behaviour — no page-object imports, no `new LoginPage(page)`, no waits:

```js
import { test, expect } from '../../src/fixtures.js';

test.describe('Login', { tag: ['@smoke', '@auth'] }, () => {
  test('valid user can sign in', async ({ pages, config }) => {
    await pages.loginPage.goto();
    await pages.loginPage.login(config.users.standard);

    await expect(pages.loginPage.page).toHaveURL(/dashboard/i);
  });
});
```

### Fixtures

| Fixture   | What you get                                                               |
| --------- | -------------------------------------------------------------------------- |
| `pages`   | Lazy page-object registry — `pages.loginPage`, `pages.dashboardPage`       |
| `config`  | Validated environment config (`config.baseURL`, `config.users.admin`, ...) |
| `data`    | Faker-backed data factory — `data.user({ email: 'fixed@test.com' })`       |
| `api`     | `ApiClient` bound to `API_BASE_URL`                                        |
| `loginAs` | `await loginAs('admin')` → a page in its own authenticated context         |
| `logger`  | Scoped logger; its output is attached to the report when a test fails      |
| `newUser` | Project fixture: fresh unique user data per test (`src/fixtures.js`)       |

Console errors, page errors, screenshots, video, traces and the test log are attached automatically
**on failure only**, so green runs stay fast.

### Adding a page object

1. Create `src/pages/CheckoutPage.js` extending `BasePage`; set `path` and `identifier`, declare
   locators, expose business methods.
2. Register it in `src/pages/index.js`.
3. Use it as `pages.checkoutPage` — no other wiring.

```js
import { BasePage } from '../../framework/core/BasePage.js';

export class CheckoutPage extends BasePage {
  constructor(page, deps) {
    super(page, deps);
    this.path = '/checkout';
    this.placeOrderButton = page.getByRole('button', { name: /place order/i });
    this.identifier = this.placeOrderButton;
  }

  async placeOrder() {
    this.logger.step('Place order');
    await this.click(this.placeOrderButton);
    return this;
  }
}
```

`UiActions` gives every page and component the same helpers: `click`, `safeClick`, `clickIfVisible`,
`fill` (with `{ mask: true }` for secrets), `uploadFile`, `selectOption`, `waitForVisible`,
`expectText`, `expectCount`, and more.

---

## Authentication & session reuse

The `setup` project runs first, signs in **once per role** through the UI and stores the session in
`.auth/<env>-<role>.json`. Sessions younger than `AUTH_MAX_AGE_MINUTES` are reused as-is.

```js
import { authState, anonymousState } from '../../framework/index.js';

test.use({ storageState: authState('standard') }); // authenticated
test.use({ storageState: anonymousState }); // forced logged-out
```

```bash
npm run auth:refresh    # force a fresh login for every role
npm run clean:auth      # delete stored sessions
```

Only the login _steps_ are project-specific (`tests/setup/auth.setup.js`); where and when state is
stored is handled by the framework.

---

## API testing

```js
import { test, expect } from '../../src/fixtures.js';
import { UserService } from '../../src/api/index.js';

test('returns a list of users', async ({ api }) => {
  const response = await new UserService(api).listUsers();
  expect(response.status).toBe(200);
});
```

`ApiClient` returns `{ status, ok, body, headers, url, durationMs }`, retries 408/429/5xx with
exponential backoff, supports `expectStatus` for fail-fast assertions (the response body is included
in the error), and logs every call. The `api` project runs without a browser or auth setup.

---

## Running tests

| Command                      | Description                              |
| ---------------------------- | ---------------------------------------- |
| `npm test`                   | Every project                            |
| `npm run test:headed`        | Headed browser                           |
| `npm run test:ui-mode`       | Playwright UI mode                       |
| `npm run test:debug`         | Inspector                                |
| `npm run test:chromium`      | One browser (also firefox/webkit/mobile) |
| `npm run test:api`           | API project only                         |
| `npm run test:smoke`         | `@smoke` tagged tests                    |
| `npm run test:regression`    | `@regression` tagged tests               |
| `npm run test:tag @critical` | Any tag                                  |
| `npm run test:failed`        | Re-run last failures                     |
| `npm run test:serial`        | Single worker                            |
| `npm run codegen`            | Record a new test                        |

Tags live on `test.describe` / `test`, e.g. `{ tag: ['@smoke', '@auth'] }`.

---

## Reports & artifacts

| Path                        | Content                             |
| --------------------------- | ----------------------------------- |
| `reports/html/`             | HTML report (`npm run report`)      |
| `reports/json/results.json` | Machine-readable results            |
| `reports/junit/results.xml` | CI/JUnit integrations               |
| `reports/artifacts/`        | Traces, videos, failure screenshots |
| `reports/logs/test-run.log` | Structured run log (worker-tagged)  |

```bash
npm run clean        # wipe generated output
npm run clean:dry    # show what would be removed
npm run clean:all    # output + stored sessions
npm run trace reports/artifacts/<test>/trace.zip
```

---

## CI

`.github/workflows/playwright.yml` lints, then runs one job per project (api, chromium, firefox,
webkit, mobile-chrome) in parallel, installing only the browser that job needs. It uploads `reports/`
per project and publishes the JUnit results.

Configure in **Settings → Secrets and variables → Actions**:

- Variables: `BASE_URL`, `API_BASE_URL`
- Secrets: `STANDARD_USERNAME`, `STANDARD_PASSWORD`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`

Real environment variables override the `.env` files, so nothing in the repository changes per
environment. Manual runs (`workflow_dispatch`) accept an environment and a tag filter; a nightly
schedule runs against staging.

---

## Conventions

- Tests contain **behaviour only** — selectors, waits and credentials live elsewhere.
- Prefer user-facing locators (`getByRole`, `getByLabel`, `getByPlaceholder`) over CSS.
- Never hard-code waits; use `TIMEOUTS`, Playwright auto-waiting, or `waitFor` for real conditions.
- Generated data (`data.user()`) for anything a test creates, so re-runs never collide.
- `npm run lint` and `npm run format` before pushing.
