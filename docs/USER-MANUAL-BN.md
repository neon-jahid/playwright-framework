# Playwright Automation Framework — ব্যবহারকারী ম্যানুয়াল (বাংলা)

এই ডকুমেন্টটি একজন **SQA ইঞ্জিনিয়ার** হিসেবে এই ফ্রেমওয়ার্ক ব্যবহার করতে, নতুন টেস্ট লিখতে,
কোডের প্রতিটি অংশ কীভাবে কাজ করে তা বুঝতে এবং CI-তে চালাতে যা যা জানা দরকার — তার সম্পূর্ণ গাইড।

> ইংরেজি সংক্ষিপ্ত রেফারেন্সের জন্য দেখুন [`README.md`](../README.md)। এই ফাইলটি তার চেয়ে
> অনেক বিস্তারিত — এখানে প্রতিটি ফাইলের ভেতরে কী ঘটছে তা লাইন-বাই-লাইন ব্যাখ্যা করা হয়েছে।

---

## সূচিপত্র

1. [ফ্রেমওয়ার্ক পরিচিতি](#১-ফ্রেমওয়ার্ক-পরিচিতি)
2. [ইনস্টলেশন ও প্রথম রান](#২-ইনস্টলেশন-ও-প্রথম-রান)
3. [ফোল্ডার স্ট্রাকচার](#৩-ফোল্ডার-স্ট্রাকচার)
4. [Configuration সিস্টেম (`framework/config/environment.js`)](#৪-configuration-সিস্টেম)
5. [`playwright.config.js` — রানার কীভাবে কনফিগার হয়](#৫-playwrightconfigjs)
6. [Fixture সিস্টেম — ফ্রেমওয়ার্কের হৃদপিণ্ড](#৬-fixture-সিস্টেম)
7. [Page Object Model — `UiActions`, `BasePage`, `BaseComponent`](#৭-page-object-model)
8. [Page Registry (`pages.loginPage` কীভাবে কাজ করে)](#৮-page-registry)
9. [Authentication ও Session পুনর্ব্যবহার](#৯-authentication-ও-session-পুনর্ব্যবহার)
10. [API টেস্টিং — `ApiClient` ও Service ক্লাস](#১০-api-টেস্টিং)
11. [টেস্ট ডেটা — `dataFactory` ও `src/data`](#১১-টেস্ট-ডেটা)
12. [Utility মডিউলসমূহ (logger, waits, files, artifacts, timeouts)](#১২-utility-মডিউলসমূহ)
13. [টেস্ট লেখার নিয়ম ও প্যাটার্ন](#১৩-টেস্ট-লেখার-নিয়ম-ও-প্যাটার্ন)
14. [টেস্ট চালানো — সব কমান্ড](#১৪-টেস্ট-চালানো--সব-কমান্ড)
15. [রিপোর্ট, আর্টিফ্যাক্ট ও ডিবাগিং](#১৫-রিপোর্ট-আর্টিফ্যাক্ট-ও-ডিবাগিং)
16. [CI/CD — GitHub Actions](#১৬-cicd--github-actions)
17. [ধাপে ধাপে রেসিপি (নতুন কিছু যোগ করা)](#১৭-ধাপে-ধাপে-রেসিপি)
18. [সমস্যা ও সমাধান (Troubleshooting)](#১৮-সমস্যা-ও-সমাধান)
19. [SQA হিসেবে মেনে চলার নিয়ম (Best Practices)](#১৯-sqa-হিসেবে-মেনে-চলার-নিয়ম)
20. [দ্রুত রেফারেন্স (Cheat Sheet)](#২০-দ্রুত-রেফারেন্স)

---

## ১. ফ্রেমওয়ার্ক পরিচিতি

এটি [Playwright Test](https://playwright.dev)-এর উপরে তৈরি একটি **UI + API টেস্ট অটোমেশন
ফ্রেমওয়ার্ক**। মূল ধারণা খুব সহজ:

> **টেস্ট শুধু "কী যাচাই করছি" বলবে। "কীভাবে" করছি — সেটা ফ্রেমওয়ার্কের কাজ।**

তাই একটি টেস্ট দেখতে এমন হয় — কোনো `new LoginPage(page)` নেই, কোনো `waitForTimeout` নেই,
কোনো পাসওয়ার্ড হার্ডকোড নেই:

```js
test('valid user can sign in', async ({ pages, config }) => {
  await pages.loginPage.login(config.users.standard);
  await expect(pages.loginPage.page).toHaveURL(/dashboard/i);
});
```

### দুটি স্তর (Layer) — এটাই সবচেয়ে গুরুত্বপূর্ণ ধারণা

| স্তর                                     | কী থাকে                                                        | অ্যাপ সম্পর্কে জানে? |
| ---------------------------------------- | -------------------------------------------------------------- | -------------------- |
| `framework/`                             | ইঞ্জিন — fixture, base class, config loader, logger, ApiClient | **না**               |
| `src/`, `tests/`, `config/environments/` | এই অ্যাপ্লিকেশনের page object, ডেটা, স্পেক, URL                | **হ্যাঁ**            |

`framework/` ফোল্ডারটি যেকোনো নতুন প্রজেক্টে হুবহু কপি করে দেওয়া যায় — এতে
letsvibebd.com-এর কোনো চিহ্ন নেই। এই আলাদা করাটাই ফ্রেমওয়ার্কটিকে "reusable" বানায়।

### কী কী ফিচার আছে

- **Page Object Model** — `BasePage` / `BaseComponent` / `UiActions` (৮০+ রেডিমেড হেল্পার)
- **Fixture-based dependency injection** — `pages`, `config`, `data`, `api`, `logger`, `loginAs`
- **Multi-environment** — `TEST_ENV=dev|staging|prod`, কোড পরিবর্তন ছাড়াই
- **Session reuse** — একবার লগইন করে `storageState` সেভ, সব টেস্টে পুনর্ব্যবহার
- **API testing** — অটো-রিট্রাই ও লগসহ `ApiClient`
- **Rich diagnostics** — ফেল হলে screenshot, video, trace, browser console error, টেস্ট লগ
- **CI-ready** — GitHub Actions ওয়ার্কফ্লো, ব্রাউজার ম্যাট্রিক্স, JUnit রিপোর্ট

---

## ২. ইনস্টলেশন ও প্রথম রান

### পূর্বশর্ত

- **Node.js ≥ 18** (`package.json` → `engines`)। যাচাই: `node -v`
- **Git**
- VS Code (সাথে Playwright এক্সটেনশন হলে ভালো)

### ধাপে ধাপে

```bash
# ১. ডিপেন্ডেন্সি ইনস্টল
npm install

# ২. ব্রাউজার ইনস্টল (chromium, firefox, webkit)
npx playwright install --with-deps

# ৩. নিজের ক্রেডেনশিয়াল ফাইল তৈরি
cp config/environments/.env.example config/environments/.env.local

# ৪. প্রথম রান
npm test
```

### `.env.local` কেন লাগে

`.env.local` ফাইলটি **git-ignored** — অর্থাৎ এটি কখনো কমিট হবে না। আসল ইউজারনেম/পাসওয়ার্ড
শুধু এখানেই রাখবেন, কখনোই `.env.dev` বা কোডের ভেতরে নয়।

```dotenv
# config/environments/.env.local
STANDARD_USERNAME=your.real@email.com
STANDARD_PASSWORD=YourRealPassword
ADMIN_USERNAME=admin@email.com
ADMIN_PASSWORD=AdminPassword
```

ক্রেডেনশিয়াল না দিলে কী হয়? **কিছুই ভাঙে না** — `setup` প্রজেক্ট এবং auth-নির্ভর টেস্টগুলো
নিজেরাই `skip` হয়ে যায়। এটি ইচ্ছাকৃত ডিজাইন, যাতে নতুন কেউ ক্লোন করেই সুইট চালাতে পারে।

---

## ৩. ফোল্ডার স্ট্রাকচার

```
playwright-framework/
│
├── framework/                    ← রিইউজেবল ইঞ্জিন (অ্যাপ সম্পর্কে কিছুই জানে না)
│   ├── index.js                  পাবলিক এক্সপোর্ট — সব ইমপোর্ট এখান থেকে
│   ├── api/ApiClient.js          HTTP ক্লায়েন্ট (লগ + রিট্রাই + স্ট্যাটাস অ্যাসার্ট)
│   ├── auth/authManager.js       storageState তৈরি, পুনর্ব্যবহার, মেয়াদ
│   ├── config/environment.js     .env লোড + ভ্যালিডেট → একটি frozen config
│   ├── constants/timeouts.js     TIMEOUTS ও RETRY ধ্রুবক
│   ├── core/
│   │   ├── UiActions.js          সব এলিমেন্ট ইন্টারঅ্যাকশন (click/fill/wait/expect)
│   │   ├── BasePage.js           নেভিগেশন, ডাউনলোড, ডায়ালগ, নেটওয়ার্ক মক
│   │   └── BaseComponent.js      root locator-এ scoped রিইউজেবল কম্পোনেন্ট
│   ├── fixtures/
│   │   ├── index.js              config, logger, pages, data, api, loginAs fixture
│   │   └── pageRegistry.js       pages.loginPage → LoginPage (Proxy ম্যাজিক)
│   └── utils/                    logger, dataFactory, paths, fileUtils, waitUtils, artifacts
│
├── src/                          ← এই অ্যাপ্লিকেশনের স্তর
│   ├── fixtures.js               প্রতিটি স্পেকের `test` / `expect` এখান থেকে আসে
│   ├── pages/
│   │   ├── index.js              পেজ রেজিস্ট্রি (নতুন পেজ এখানে যোগ করতে হয়)
│   │   ├── LoginPage.js
│   │   ├── RegistrationPage.js
│   │   ├── DashboardPage.js
│   │   └── components/HeaderComponent.js
│   ├── api/
│   │   ├── index.js
│   │   └── services/UserService.js
│   └── data/
│       ├── users.js              invalidUser, roles, registrationData()
│       └── messages.js           প্রত্যাশিত UI টেক্সট/এরর মেসেজ
│
├── tests/
│   ├── setup/auth.setup.js       রান শুরুতে একবার লগইন করে সেশন সেভ করে
│   ├── ui/                       ব্রাউজার স্পেক (login, registration, dashboard)
│   └── api/                      API স্পেক (ব্রাউজার ছাড়া)
│
├── config/environments/          .env.dev | .env.staging | .env.prod | .env.example
├── assets/upload/                আপলোড টেস্টের ফাইল
├── scripts/clean.js              জেনারেটেড আউটপুট মুছে ফেলার স্ক্রিপ্ট
├── reports/                      html | json | junit | logs | screenshots | artifacts (git-ignored)
├── .auth/                        সেভ করা সেশন <env>-<role>.json (git-ignored)
├── .github/workflows/playwright.yml   CI পাইপলাইন
└── playwright.config.js          Playwright রানার কনফিগ
```

### কোন ফাইল কখন ছুঁতে হবে

| আপনি যা করতে চান                   | যে ফাইল এডিট করবেন                             |
| ---------------------------------- | ---------------------------------------------- |
| নতুন টেস্ট কেস লেখা                | `tests/ui/*.spec.js` বা `tests/api/*.spec.js`  |
| নতুন পেজ/স্ক্রিন যোগ করা           | `src/pages/NewPage.js` + `src/pages/index.js`  |
| নতুন API এন্ডপয়েন্ট               | `src/api/services/*.js` + `src/api/index.js`   |
| নতুন URL/ক্রেডেনশিয়াল/টাইমআউট     | `config/environments/.env.*`                   |
| নতুন এরর মেসেজ/স্ট্যাটিক ডেটা      | `src/data/messages.js`, `src/data/users.js`    |
| নতুন সাধারণ হেল্পার (সব প্রজেক্টে) | `framework/...` (সাবধানে — এটি শেয়ারড ইঞ্জিন) |

---

## ৪. Configuration সিস্টেম

**ফাইল:** `framework/config/environment.js` — পুরো ফ্রেমওয়ার্কে **একমাত্র** জায়গা যেখানে
`process.env` পড়া হয়।

### ৪.১ কোন ভ্যালু কোথা থেকে আসে (Resolution Order)

পরে যেটা আসে সেটাই জেতে:

1. `config/environments/.env.<env>` — কমিট করা ডিফল্ট
2. `config/environments/.env.<env>.local` — শুধু এই environment-এর লোকাল ওভাররাইড
3. `config/environments/.env.local` — আপনার মেশিনের ব্যক্তিগত ভ্যালু (git-ignored)
4. **আসল environment variable** (যেমন GitHub Actions secret) — **সর্বদা সর্বোচ্চ অগ্রাধিকার**

```js
// loadDotEnvFiles() — সংক্ষেপে
for (const [key, value] of Object.entries(merged)) {
  const current = process.env[key];
  if (current === undefined || current === '') process.env[key] = value;
}
```

> **গুরুত্বপূর্ণ (CI বাগ ফিক্স):** `current === ''` চেকটি ইচ্ছাকৃত। GitHub Actions
> ওয়ার্কফ্লোর `env:` ব্লকে লেখা প্রতিটি ভ্যারিয়েবল **সবসময়** এক্সপোর্ট করে — রিপোতে
> `vars.BASE_URL` সেট না থাকলেও `BASE_URL=""` হিসেবে পাঠায়। খালি স্ট্রিংকে "সেট করা হয়নি"
> ধরা না হলে সেটি `.env` ফাইলের আসল ভ্যালুকে ঢেকে দিত এবং প্রতিটি CI রান
> `Missing required environment variable(s) [BASE_URL]` দিয়ে ক্র্যাশ করত।

### ৪.২ TEST_ENV নির্বাচন

```bash
npm run test:dev        # TEST_ENV=dev      (ডিফল্ট)
npm run test:staging    # TEST_ENV=staging
npm run test:prod       # TEST_ENV=prod
```

`dev | staging | prod` ছাড়া অন্য কিছু দিলে সাথে সাথেই পরিষ্কার এরর দেয়
(`SUPPORTED_ENVIRONMENTS`)।

### ৪.৩ ভ্যালিডেশন — Fail Fast

```js
const REQUIRED_VARIABLES = ['BASE_URL'];
```

`BASE_URL` না থাকলে টেস্ট রান শুরুই হবে না; বদলে একটি পরিষ্কার বার্তা আসবে যাতে কোন ফাইলে কী
যোগ করতে হবে তা লেখা থাকে। আপনার প্রজেক্টে আরও আবশ্যক ভ্যারিয়েবল থাকলে এই অ্যারেতে যোগ করুন।

### ৪.৪ ক্রেডেনশিয়াল — Convention over Configuration

`collectUsers()` ফাংশনটি `^([A-Z0-9_]+)_USERNAME$` প্যাটার্নে মেলা **প্রতিটি** ভ্যারিয়েবল
খুঁজে নেয় এবং রোল বানায়:

```dotenv
MANAGER_USERNAME=manager@example.com
MANAGER_PASSWORD=Secret123
SUPER_ADMIN_USERNAME=root@example.com
SUPER_ADMIN_PASSWORD=Secret123
```

ফলাফল — **কোনো কোড লেখা ছাড়াই**:

```js
config.users.manager; // { role: 'manager', username, password }
config.users.superAdmin; // SUPER_ADMIN → superAdmin (camelCase)
```

`getUser('manager')` ব্যবহার করলে ক্রেডেনশিয়াল না থাকলে সহায়ক এরর পাওয়া যায় (কোন
ভ্যারিয়েবল দুটি লাগবে + কোন রোলগুলো পাওয়া গেছে)।

### ৪.৫ সম্পূর্ণ config অবজেক্ট

`getConfig()` একটি **frozen** (অপরিবর্তনীয়) অবজেক্ট ফেরত দেয়, এবং প্রতি worker-এ একবারই
তৈরি হয় (`cachedConfig`)।

| কী                    | উৎস (env var)                   | ডিফল্ট                       |
| --------------------- | ------------------------------- | ---------------------------- |
| `environment`         | `TEST_ENV` / `ENV`              | `dev`                        |
| `isCI`                | `CI`                            | `false`                      |
| `baseURL`             | `BASE_URL`                      | **আবশ্যক**                   |
| `apiBaseURL`          | `API_BASE_URL`                  | `BASE_URL`                   |
| `apiToken`            | `API_TOKEN`                     | `undefined`                  |
| `users`               | `<ROLE>_USERNAME` / `_PASSWORD` | `{}`                         |
| `authMaxAgeMinutes`   | `AUTH_MAX_AGE_MINUTES`          | `60`                         |
| `forceAuthRefresh`    | `FORCE_AUTH_REFRESH`            | `false`                      |
| `headless`            | `HEADLESS` / `HEADED`           | `true`                       |
| `slowMo`              | `SLOW_MO`                       | `0`                          |
| `ignoreHTTPSErrors`   | `IGNORE_HTTPS_ERRORS`           | `false`                      |
| `testIdAttribute`     | `TEST_ID_ATTRIBUTE`             | `data-testid`                |
| `workers`             | `WORKERS`                       | CI-তে `50%`, লোকালে অটো      |
| `retries`             | `RETRIES`                       | CI-তে `2`, লোকালে `0`        |
| `timeouts.test`       | `TEST_TIMEOUT_MS`               | `60000`                      |
| `timeouts.expect`     | `EXPECT_TIMEOUT_MS`             | `10000`                      |
| `timeouts.action`     | `ACTION_TIMEOUT_MS`             | `15000`                      |
| `timeouts.navigation` | `NAVIGATION_TIMEOUT_MS`         | `30000`                      |
| `logLevel`            | `LOG_LEVEL`                     | CI-তে `info`, লোকালে `debug` |
| `logToFile`           | `LOG_TO_FILE`                   | `true`                       |

**বুলিয়ান পার্সিং:** `1`, `true`, `yes`, `on` → `true`; বাকি সব → `false`।

### ৪.৬ টেস্টের ভেতরে ব্যবহার

```js
test('example', async ({ config }) => {
  console.log(config.baseURL); // https://letsvibebd.com
  console.log(config.environment); // dev
  console.log(config.users.standard.username);
});
```

কখনোই টেস্টে সরাসরি `process.env.X` লিখবেন না — সবসময় `config` fixture ব্যবহার করুন।

---

## ৫. `playwright.config.js`

এই ফাইলটি নিজে কোনো ভ্যালু হার্ডকোড করে না; প্রথম লাইনেই `getConfig()` ডেকে সব কিছু
`.env` থেকে নেয়।

### ৫.১ সাধারণ সেটিংস

```js
testDir: './tests',
outputDir: PATHS.artifacts,   // reports/artifacts
fullyParallel: true,          // ফাইল ও টেস্ট — দুটোই সমান্তরালে
workers: config.workers,
retries: config.retries,
timeout: config.timeouts.test,
expect: { timeout: config.timeouts.expect },
forbidOnly: config.isCI,      // CI-তে test.only থাকলে রান ফেল করবে
reportSlowTests: { max: 5, threshold: 30_000 },
```

### ৫.২ শেয়ার্ড `use` — ফেইলিওর ডায়াগনস্টিকস

```js
screenshot: { mode: 'only-on-failure', fullPage: true },
video: 'retain-on-failure',
trace: config.isCI ? 'on-first-retry' : 'retain-on-failure',
```

অর্থাৎ পাস করা টেস্টে কোনো ভারী আর্টিফ্যাক্ট তৈরি হয় না — রান দ্রুত থাকে, রিপোর্ট হালকা
থাকে। ফেল করলেই কেবল স্ক্রিনশট, ভিডিও ও ট্রেস সংরক্ষিত হয়।

### ৫.৩ Projects — ৬টি

| Project         | testDir       | ডিভাইস          | নির্ভরতা | কাজ                         |
| --------------- | ------------- | --------------- | -------- | --------------------------- |
| `setup`         | `tests/setup` | Desktop Chrome  | —        | একবার লগইন করে সেশন সেভ করে |
| `chromium`      | `tests/ui`    | Desktop Chrome  | `setup`  | ডেস্কটপ ক্রোম UI টেস্ট      |
| `firefox`       | `tests/ui`    | Desktop Firefox | `setup`  | ফায়ারফক্স UI টেস্ট         |
| `webkit`        | `tests/ui`    | Desktop Safari  | `setup`  | সাফারি/WebKit UI টেস্ট      |
| `mobile-chrome` | `tests/ui`    | Pixel 7         | `setup`  | মোবাইল ভিউপোর্ট টেস্ট       |
| `api`           | `tests/api`   | ব্রাউজার নেই    | —        | দ্রুত API/কন্ট্রাক্ট টেস্ট  |

**`dependencies: ['setup']`** — এর মানে UI প্রজেক্ট চালালে Playwright **আগে** `setup`
প্রজেক্ট চালাবে। এজন্যই CI-তে firefox/webkit শার্ডেও chromium ইনস্টল করা লাগে (setup
chromium-এ লগইন করে)। সেশন ফাইল browser-agnostic, তাই একবার লগইন করলেই সব ব্রাউজারে চলে।

### ৫.৪ Reporters

| Reporter | আউটপুট                      | কাজে লাগে                        |
| -------- | --------------------------- | -------------------------------- |
| `list`   | টার্মিনাল                   | লাইভ প্রগ্রেস                    |
| `html`   | `reports/html`              | মানুষের পড়ার রিপোর্ট (trace সহ) |
| `json`   | `reports/json/results.json` | কাস্টম ড্যাশবোর্ড/পার্সিং        |
| `junit`  | `reports/junit/results.xml` | CI/Jira/TestRail ইন্টিগ্রেশন     |
| `github` | শুধু CI-তে                  | PR-এ ইনলাইন অ্যানোটেশন           |

---

## ৬. Fixture সিস্টেম

**ফাইল:** `framework/fixtures/index.js` — এখানেই ফ্রেমওয়ার্কের আসল "ম্যাজিক"।

Fixture হলো Playwright-এর dependency injection। টেস্টের প্যারামিটারে যে নামটি লিখবেন, শুধু
সেটিই তৈরি হবে — না চাইলে তৈরিও হবে না (তাই API টেস্টে ব্রাউজার খোলে না)।

### ৬.১ উপলব্ধ Fixture তালিকা

| Fixture         | Scope  | কী দেয়                                                 |
| --------------- | ------ | ------------------------------------------------------- |
| `config`        | worker | ভ্যালিডেটেড environment config                          |
| `data`          | worker | `dataFactory` (faker-ভিত্তিক ডেটা জেনারেটর)             |
| `logger`        | test   | টেস্ট-নামে scoped লগার, ফেল হলে রিপোর্টে অ্যাটাচ হয়    |
| `pages`         | test   | লেজি পেজ-অবজেক্ট রেজিস্ট্রি (`pages.loginPage`)         |
| `api`           | test   | `API_BASE_URL`-এ বাঁধা `ApiClient`                      |
| `loginAs`       | test   | `await loginAs('admin')` → অথেনটিকেটেড নতুন Page        |
| `page`          | test   | Playwright-এর page, সাথে console-error ক্যাপচার যোগ করা |
| `testLifecycle` | auto   | প্রতিটি টেস্টের শুরু/শেষ লগ + ফেল হলে লগ অ্যাটাচ        |
| `pageObjects`   | option | প্রজেক্টের পেজ ক্লাসগুলো ইনজেক্ট করার চ্যানেল           |

**worker scope** মানে প্রতি worker প্রসেসে একবার তৈরি হয়ে সব টেস্টে পুনর্ব্যবহৃত হয়
(পারফরম্যান্স)। **test scope** মানে প্রতিটি টেস্টের জন্য নতুন (আইসোলেশন)।

### ৬.২ `testLifecycle` — অটো ফিক্সচার

```js
testLifecycle: [
  async ({ logger }, use, testInfo) => {
    logger.info(`TEST START | ${testInfo.titlePath.join(' > ')} | project=${testInfo.project.name}`);
    await use();
    const outcome = testFailed(testInfo) ? 'FAILED' : 'PASSED';
    logger.info(`TEST ${outcome} | ${testInfo.title} | ${testInfo.duration}ms`);
    if (testFailed(testInfo)) await attachText(testInfo, 'test-log.txt', logger.dump());
  },
  { auto: true },
],
```

- `{ auto: true }` — টেস্টে না চাইলেও প্রতিটি টেস্টে চলে।
- ইচ্ছাকৃতভাবে `page`-এর উপর নির্ভর করে না, তাই **API টেস্টে ব্রাউজার চালু হয় না**।
- ফেল হলে পুরো লগ বাফার `test-log.txt` নামে HTML রিপোর্টে যুক্ত হয়।

### ৬.৩ `page` ওভাররাইড — ব্রাউজার কনসোল এরর

ফ্রেমওয়ার্ক Playwright-এর নিজের `page` fixture-কে মুড়ে দিয়েছে: `console` টাইপ `error` এবং
`pageerror` ইভেন্ট জমা করে, টেস্ট ফেল হলে `browser-console-errors.txt` হিসেবে অ্যাটাচ করে।
UI বাগ ডিবাগ করার সময় এটি সোনার খনি — অনেক সময় ফ্রন্টএন্ড JS এরর-ই আসল কারণ।

### ৬.৪ `loginAs` — মাল্টি-রোল টেস্ট

```js
test('admin session is independent', async ({ loginAs }) => {
  const adminPage = await loginAs('admin'); // সেভ করা admin সেশন
  await adminPage.goto('/dashboard');
});
```

- প্রতিটি কলে **আলাদা BrowserContext** — দুই রোল একে অপরকে প্রভাবিত করে না।
- টেস্ট শেষে সব context নিজে থেকে বন্ধ হয়।
- সেশন ফাইল না থাকলে পরিষ্কার এরর: "Run the `setup` project first…"।

### ৬.৫ প্রজেক্ট-নির্দিষ্ট Fixture যোগ করা

**ফাইল:** `src/fixtures.js`

```js
export const test = withPageObjects(pageObjects).extend({
  newUser: async ({ data }, use) => {
    await use(registrationData(data)); // প্রতি টেস্টে ইউনিক রেজিস্ট্রেশন ডেটা
  },
});
```

নতুন fixture (যেমন "seeded cart", "feature flag") এখানেই যোগ করবেন — `framework/`-এ নয়।
কারণ `framework/` অ্যাপ-নিরপেক্ষ থাকতে হবে।

---

## ৭. Page Object Model

তিনটি ক্লাসের উত্তরাধিকার শৃঙ্খল:

```
UiActions  (সব এলিমেন্ট ইন্টারঅ্যাকশন — scope = Page অথবা Locator)
   ├── BasePage       (scope = Page)      → নেভিগেশন, ডাউনলোড, ডায়ালগ, নেটওয়ার্ক
   └── BaseComponent  (scope = root Locator) → পুনঃব্যবহারযোগ্য UI অংশ
```

### ৭.১ `UiActions` — কমন হেল্পার

প্রতিটি মেথড **string selector বা Locator** — দুটোই গ্রহণ করে, এবং বেশিরভাগ `this` ফেরত দেয়
(চেইন করা যায়)।

**Locator বিল্ডার:** `locator()`, `getByTestId()`, `getByRole()`, `getByText()`,
`getByLabel()`, `getByPlaceholder()`

**অ্যাকশন:**

| মেথড                                                    | কাজ                                                     |
| ------------------------------------------------------- | ------------------------------------------------------- |
| `click(target)`                                         | সাধারণ ক্লিক (লগসহ)                                     |
| `safeClick(target)`                                     | রি-রেন্ডার/ওভারলে সহ্য করে — ব্যাকঅফসহ ৩ বার চেষ্টা করে |
| `clickIfVisible(target)`                                | থাকলে ক্লিক করে, না থাকলে চুপচাপ `false` (কুকি ব্যানার) |
| `doubleClick()` / `rightClick()`                        | ডাবল/রাইট ক্লিক                                         |
| `fill(target, value, { mask })`                         | ইনপুট পূরণ; `mask: true` দিলে লগে `********` দেখায়     |
| `typeText()`                                            | এক এক অক্ষর করে টাইপ (key-handler থাকা ইনপুটে)          |
| `clear()`, `check()`, `uncheck()`, `selectOption()`     | ফর্ম কন্ট্রোল                                           |
| `hover()`, `pressKey()`, `scrollIntoView()`, `dragTo()` | ইন্টারঅ্যাকশন                                           |
| `uploadFile(target, files)`                             | `assets/upload/` থেকে ফাইল আপলোড (বা absolute path)     |

**স্টেট রিডার:** `getText()`, `getAllTexts()`, `getAttribute()`, `getInputValue()`,
`count()`, `isVisible()`, `isEnabled()`, `isChecked()`

**ওয়েট:** `waitForVisible()`, `waitForHidden()`, `waitForEnabled()`

**অ্যাসারশন (page object-এর ভেতরে ব্যবহারের জন্য):** `expectVisible()`, `expectHidden()`,
`expectText()`, `expectContainsText()`, `expectValue()`, `expectCount()`

> **কেন `expect` র‍্যাপ করা হলো?** যাতে page object-এ `import { expect }` না লিখেই
> `await this.expectVisible(this.errorMessage)` লেখা যায় — কোড পড়তে ব্যবসায়িক ভাষার মতো লাগে।

### ৭.২ `BasePage` — পেজ-লেভেল ক্ষমতা

প্রতিটি page object দুটি জিনিস সেট করে:

```js
this.path = '/signin'; // baseURL-এর সাপেক্ষে রুট
this.identifier = this.passwordInput; // যে এলিমেন্ট দেখলে বোঝা যায় পেজ লোড হয়েছে
```

তারপর বিনামূল্যে পাওয়া যায়:

| মেথড                                           | কাজ                                                    |
| ---------------------------------------------- | ------------------------------------------------------ |
| `goto(target?)`                                | নেভিগেট + `waitUntilLoaded()`                          |
| `reload()`, `goBack()`                         | রিলোড / পেছনে                                          |
| `waitUntilLoaded(timeout)`                     | DOM + `identifier` দৃশ্যমান হওয়া পর্যন্ত অপেক্ষা      |
| `isLoaded()`                                   | throw না করে `true/false` (কন্ডিশনাল ফ্লো)             |
| `waitForUrl()`, `expectUrl()`, `expectTitle()` | URL/টাইটেল যাচাই                                       |
| `url`, `currentUrl`, `title()`                 | তথ্য                                                   |
| `screenshot(name)`                             | `reports/screenshots`-এ সেভ করে পাথ ফেরত দেয়          |
| `downloadFile(trigger, { saveAs })`            | ডাউনলোড ধরে `reports/downloads`-এ সেভ করে              |
| `handleDialog({ accept, promptText })`         | পরবর্তী `alert/confirm/prompt` হ্যান্ডেল করে           |
| `waitForResponse(pattern, trigger)`            | অ্যাকশনের ফলে আসা API রেসপন্স ধরে                      |
| `mockResponse(pattern, body, status)`          | নেটওয়ার্ক কল স্টাব করে (থার্ড-পার্টি নির্ভরতা কাটাতে) |

### ৭.৩ একটি বাস্তব Page Object পড়া — `LoginPage`

```js
export class LoginPage extends BasePage {
  constructor(page, deps) {
    super(page, deps);

    this.path = '/signin'; // ১. রুট

    // ২. লোকেটর — পড়ার মতো নামে
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.loginButton = page.getByRole('button', { name: /log ?in/i });
    this.errorMessages = page.locator('p.text-red-500');
    this.errorMessage = this.errorMessages.first();

    this.identifier = this.passwordInput; // ৩. লোড প্রমাণকারী এলিমেন্ট
  }

  // ৪. ব্যবসায়িক অ্যাকশন
  async login(user) {
    this.logger.step(`Login as "${user.username}"`);
    await this.fill(this.usernameInput, user.username);
    await this.fill(this.passwordInput, user.password, { mask: true }); // পাসওয়ার্ড লগে যাবে না
    await this.click(this.loginButton);
    return this;
  }

  // ৫. ব্যবসায়িক অ্যাসারশন
  async expectErrorMessage(expectedText) {
    await this.expectVisible(this.errorMessage);
    if (expectedText) await this.expectContainsText(this.errorMessage, expectedText);
    return this;
  }
}
```

এই ৫টি ধাপই নতুন যেকোনো পেজের টেমপ্লেট।

### ৭.৪ `BaseComponent` — পুনরাবৃত্ত UI অংশ

```js
export class HeaderComponent extends BaseComponent {
  constructor(page, deps = {}) {
    super(page, page.locator('header, [data-testid="site-header"], nav').first(), deps);
    this.searchInput = this.getByPlaceholder(/search/i); // header-এর ভেতরেই খোঁজে
  }
}
```

- সব লোকেটার **root-এ scoped** — পেজের অন্য জায়গার একই ক্লাসের এলিমেন্টে ভুল করে ক্লিক হবে না।
- `nth(index)` দিয়ে একই কম্পোনেন্টের n-তম কপি পাওয়া যায় (টেবিল রো, প্রোডাক্ট কার্ড)।
- পেজে ব্যবহার: `this.header = new HeaderComponent(page, deps);` → `pages.dashboardPage.header.search('x')`

`DashboardPage`-এ লক্ষ্য করুন `identifier = undefined` রাখা হয়েছে — কারণ অ্যানোনিমাস
ভিজিটরকে `/dashboard` থেকে `/signin`-এ পাঠিয়ে দেয়, তাই "লোড হয়েছে" প্রমাণ করে URL, কোনো
এলিমেন্ট নয়। এটি একটি ভালো উদাহরণ: **অ্যাপের আচরণ বুঝে identifier ঠিক করতে হয়।**

---

## ৮. Page Registry

**ফাইল:** `framework/fixtures/pageRegistry.js`

`pages.loginPage` লিখলে কী হয়?

1. `pages` একটি **JavaScript Proxy** — কোনো প্রপার্টি পড়ার চেষ্টা করলে সে ধরে ফেলে।
2. `loginPage` → প্রথম অক্ষর বড় করে `LoginPage` বানায়।
3. `src/pages/index.js`-এর `pageObjects` অবজেক্টে `LoginPage` খোঁজে।
4. পেলে `new LoginPage(page, { config, logger })` তৈরি করে **ক্যাশে রাখে** (একই টেস্টে বারবার
   ব্যবহার করলে নতুন ইনস্ট্যান্স হয় না)।
5. না পেলে সহায়ক এরর: `Unknown page object "xyzPage". Export it from src/pages/index.js.
Available: LoginPage, RegistrationPage, DashboardPage.`

**লাভ:** টেস্টে কোনো `import` নেই, কোনো `new` নেই, এবং পেজ ক্লাস কেবল তখনই তৈরি হয় যখন
সত্যিই ব্যবহার হয় (lazy)।

**খরচ:** নতুন পেজ অবশ্যই `src/pages/index.js`-এ রেজিস্টার করতে হবে — এটাই একমাত্র ওয়্যারিং।

---

## ৯. Authentication ও Session পুনর্ব্যবহার

**ফাইল:** `framework/auth/authManager.js` + `tests/setup/auth.setup.js`

### ৯.১ ধারণা

প্রতিটি টেস্টে UI দিয়ে লগইন করা মানে বিশাল সময় নষ্ট ও অতিরিক্ত ফ্লেকিনেস। বদলে:

```
setup প্রজেক্ট (রানে একবার)
   └── UI দিয়ে লগইন → ব্রাউজারের cookie + localStorage → .auth/dev-standard.json
            ↓
UI টেস্টগুলো সেই ফাইল লোড করে সরাসরি লগইন অবস্থায় শুরু হয়
```

### ৯.২ ফাইল কোথায়

```
.auth/<environment>-<role>.json      →  .auth/dev-standard.json, .auth/staging-admin.json
```

environment আলাদা রাখার কারণ: dev-এর সেশন দিয়ে staging-এ ঢোকা যাবে না। ফোল্ডারটি
git-ignored।

### ৯.৩ প্রধান API

| ফাংশন                      | কাজ                                                               |
| -------------------------- | ----------------------------------------------------------------- |
| `storageStatePath(role)`   | সেশন ফাইলের পাথ                                                   |
| `authState(role)`          | উপরেরটির উপনাম — `test.use({ storageState: authState('admin') })` |
| `anonymousState`           | খালি সেশন — জোর করে লগ-আউট অবস্থা                                 |
| `isAuthStateFresh(role)`   | ফাইলের বয়স < `AUTH_MAX_AGE_MINUTES` কি না                        |
| `createAuthState({...})`   | দরকার হলে লগইন করে সেশন সেভ করে                                   |
| `tokenFromAuthState(role)` | localStorage থেকে টোকেন পড়ে (API টেস্টে UI লগইন পুনর্ব্যবহার)    |
| `clearAuthState(role?)`    | এক বা সব সেশন মুছে দেয়                                           |

### ৯.৪ `auth.setup.js` কীভাবে কাজ করে

```js
setup('authenticate all configured roles', async ({ browser, config, logger }) => {
  const roles = Object.values(config.users).filter((u) => u.username && u.password);

  if (roles.length === 0) {
    setup.skip(true, 'Define <ROLE>_USERNAME / <ROLE>_PASSWORD…'); // ক্রেডেনশিয়াল নেই → skip
    return;
  }

  for (const { role } of roles) {
    await createAuthState({
      browser,
      role,
      force: config.forceAuthRefresh,
      login: async (page, user) => {
        // ← একমাত্র অ্যাপ-নির্দিষ্ট অংশ
        const loginPage = new LoginPage(page, { config, logger });
        await loginPage.goto();
        await loginPage.loginAndWaitForDashboard(user);
      },
    });
  }
});
```

**নকশার মূল কথা:** ফ্রেমওয়ার্ক জানে _কোথায়_ ও _কখন_ সেশন রাখতে হবে; প্রজেক্ট জানে _কীভাবে_
লগইন করতে হয়। তাই নতুন অ্যাপে শুধু `login` কলব্যাকটি বদলাতে হয়।

### ৯.৫ টেস্টে ব্যবহারের তিন প্যাটার্ন

```js
// ১) পুরো ফাইল স্ট্যান্ডার্ড ইউজার হিসেবে
test.use({ storageState: authState('standard') });

// ২) পুরো ফাইল লগ-আউট অবস্থায় (login/registration টেস্ট)
test.use({ storageState: anonymousState });

// ৩) এক টেস্টের ভেতরে অন্য রোল
const adminPage = await loginAs('admin');
```

### ৯.৬ সেশন রিফ্রেশ

```bash
npm run auth:refresh     # FORCE_AUTH_REFRESH=true দিয়ে setup প্রজেক্ট চালায়
npm run clean:auth       # .auth/ মুছে দেয় → পরের রানে নতুন লগইন
```

---

## ১০. API টেস্টিং

**ফাইল:** `framework/api/ApiClient.js`, `src/api/services/UserService.js`

### ১০.১ `ApiClient` কী দেয়

Playwright-এর `APIRequestContext`-এর উপরে একটি পাতলা কিন্তু কার্যকর র‍্যাপার:

- `get/post/put/patch/delete` — সবগুলোই ভেতরে `send()` ডাকে
- প্রতিটি কল **লগ হয়**: `GET https://… -> 200 (99ms)`
- **অটো-রিট্রাই** শুধুমাত্র ক্ষণস্থায়ী স্ট্যাটাসে: `408, 429, 500, 502, 503, 504`
  (৪xx ক্লায়েন্ট এরর রিট্রাই হয় না — সেটা বাগ, নেটওয়ার্ক সমস্যা নয়)
- `expectStatus` — স্ট্যাটাস না মিললে **রেসপন্স বডিসহ** পরিষ্কার এরর
- বডি JSON হলে পার্স করে, না হলে টেক্সট হিসেবেই দেয়
- `API_TOKEN` থাকলে স্বয়ংক্রিয়ভাবে `Authorization: Bearer …` হেডার যোগ করে

### ১০.২ রেসপন্স অবজেক্টের আকার

```js
{
  status: 200,
  ok: true,
  body: {...},        // পার্স করা JSON বা কাঁচা টেক্সট
  headers: {...},
  url: 'https://…',
  durationMs: 99      // পারফরম্যান্স অ্যাসারশনে কাজে লাগে
}
```

### ১০.৩ Service ক্লাস প্যাটার্ন

Page object যেভাবে পেজ মোড়ে, service সেভাবে এন্ডপয়েন্ট মোড়ে:

```js
export class UserService {
  constructor(api) {
    this.api = api;
    this.resource = '/users';
  }
  listUsers(params = {}) {
    return this.api.get(this.resource, { params, expectStatus: 200 });
  }
  createUser(payload) {
    return this.api.post(this.resource, { data: payload, expectStatus: [200, 201] });
  }
}
```

টেস্টে:

```js
test.beforeEach(async ({ api }) => {
  users = new UserService(api);
});

test('returns a list of users', async () => {
  const response = await users.listUsers();
  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
});
```

### ১০.৪ API দিয়ে UI টেস্টের সেটআপ (সবচেয়ে বেশি কাজে লাগে)

UI দিয়ে ১০টা ফর্ম পূরণ করে ডেটা বানানোর বদলে API দিয়ে সেকেন্ডে বানিয়ে নিন, তারপর UI-তে
কেবল যাচাই করুন:

```js
test('created order appears in the list', async ({ api, pages }) => {
  const created = await new OrderService(api).create({ item: 'X' }); // দ্রুত সেটআপ
  await pages.ordersPage.goto();
  await pages.ordersPage.expectRowVisible(created.body.id); // আসল যাচাই UI-তে
});
```

---

## ১১. টেস্ট ডেটা

### ১১.১ `dataFactory` (`framework/utils/dataFactory.js`)

faker-এর উপরে তৈরি — প্রতিটি জেনারেটর সাধারণ অবজেক্ট ফেরত দেয়, তাই যেকোনো ফিল্ড ওভাররাইড
করা যায়।

| জেনারেটর                                                | উদাহরণ আউটপুট                            |
| ------------------------------------------------------- | ---------------------------------------- |
| `data.email('qa')`                                      | `qa.1712345678901123@example.com`        |
| `data.password(12)`                                     | নীতিমালা-সম্মত পাসওয়ার্ড (`Aa1!` সহ)    |
| `data.username()`                                       | `johndoe482`                             |
| `data.phone()`                                          | আন্তর্জাতিক ফরম্যাট                      |
| `data.dateOfBirth({minAge})`                            | `1996-04-12` (`input[type=date]` উপযোগী) |
| `data.number(1, 100)`                                   | র‍্যান্ডম সংখ্যা                         |
| `data.pick([...])`                                      | তালিকা থেকে একটি                         |
| `data.user(overrides)`                                  | সম্পূর্ণ ইউজার পেলোড                     |
| `data.address()`, `data.company()`, `data.creditCard()` | অন্যান্য ডোমেইন অবজেক্ট                  |
| `data.seed(123)`                                        | ডিটারমিনিস্টিক রান (একই ডেটা বারবার)     |

**ইউনিকনেস:** `unique()` = `Date.now()` + ৩ র‍্যান্ডম ডিজিট — তাই বারবার রান করলেও
"email already exists" হয় না।

**`data.user()`-এর বুদ্ধি:** `fullName`, `email`, `confirmPassword` — এই derived ফিল্ডগুলো
আপনার দেওয়া ওভাররাইডের সাথে **সামঞ্জস্যপূর্ণ** থাকে। `firstName` ওভাররাইড করলে ইমেইলও
সেই নামে তৈরি হয়।

### ১১.২ অ্যাপ-নির্দিষ্ট ডেটা (`src/data/`)

```js
// src/data/users.js — এই অ্যাপের ফরম্যাট
export const localPhoneNumber = (data) => `01${data.pick(['3','5',…])}${data.number(…)}`;

export const registrationData = (data, overrides = {}) =>
  data.user({
    phone: localPhoneNumber(data), // বাংলাদেশি মোবাইল ফরম্যাট
    dateOfBirth: data.dateOfBirth({ minAge: 21, maxAge: 45 }), // সাইট age-gated
    ...overrides,
  });
```

```js
// src/data/messages.js — প্রত্যাশিত কপি এক জায়গায়
export const messages = {
  login: { invalidCredentials: /do not match our records|invalid|incorrect|wrong/i },
  registration: { passwordMismatch: /match/i },
};
```

**কেন regex?** UI-এর লেখা বদলালে টেস্ট ভাঙবে না, এবং বদলাতে হলে এক জায়গায় বদলালেই হয়।

**নিয়ম:** আসল ক্রেডেনশিয়াল কখনো `src/data/`-এ নয় — সেগুলো `.env.local`/CI secret-এ।

---

## ১২. Utility মডিউলসমূহ

### ১২.১ Logger (`framework/utils/logger.js`)

- লেভেল: `error < warn < info < debug`, নিয়ন্ত্রণ করে `LOG_LEVEL`
- প্রতিটি লাইনে টাইমস্ট্যাম্প, worker ট্যাগ (`w0`, `w1`) ও scope থাকে — সমান্তরাল রানেও পড়া যায়
- `logger.child('LoginPage')` → `[LoginPage] …` প্রিফিক্স
- `logger.step('Login as X')` → `> Login as X` (ব্যবসায়িক ধাপ হাইলাইট)
- সব লাইন একটি বাফারে জমে; টেস্ট ফেল করলে বাফার রিপোর্টে অ্যাটাচ হয়
- `LOG_TO_FILE=true` হলে `reports/logs/test-run.log`-এ লেখে
- **লগিং কখনো টেস্ট ফেল করাবে না** — ফাইল লেখা ব্যর্থ হলে চুপচাপ বন্ধ হয়ে যায়

### ১২.২ Waits (`framework/utils/waitUtils.js`)

| ফাংশন                      | কখন ব্যবহার করবেন                                                     |
| -------------------------- | --------------------------------------------------------------------- |
| `waitFor(condition, opts)` | Playwright যা প্রকাশ করতে পারে না (API পোল, ব্যাকগ্রাউন্ড জব)         |
| `retry(action, opts)`      | এক্সপোনেনশিয়াল ব্যাকঅফসহ পুনঃচেষ্টা (`shouldRetry` দিয়ে নিয়ন্ত্রণ) |
| `waitForStable(locator)`   | অ্যানিমেশন/লেআউট শিফট থামা পর্যন্ত                                    |
| `sleep(ms)`                | **শেষ উপায়** — যতটা সম্ভব এড়িয়ে চলুন                               |

ডিফল্ট রিট্রাই নীতি: `RETRY = { attempts: 3, delayMs: 500, backoffFactor: 2 }` → ৫০০ms,
১০০০ms বিরতি।

> **মনে রাখুন:** Playwright নিজেই auto-wait করে (`click` করার আগে এলিমেন্ট visible ও enabled
> হওয়া পর্যন্ত অপেক্ষা করে)। তাই ৯০% ক্ষেত্রে কোনো ম্যানুয়াল wait লাগে না।

### ১২.৩ Timeouts (`framework/constants/timeouts.js`)

```js
TIMEOUTS = { INSTANT: 1s, SHORT: 5s, MEDIUM: 15s, LONG: 30s, EXTRA_LONG: 60s }
```

কোডে `5000` লেখার বদলে `TIMEOUTS.SHORT` লিখুন — উদ্দেশ্য স্পষ্ট হয়, ম্যাজিক নাম্বার থাকে না।

### ১২.৪ Artifacts (`framework/utils/artifacts.js`)

`attachScreenshot()`, `attachText()`, `attachJson()`, `attachFile()` — যা অ্যাটাচ করবেন তা
HTML রিপোর্টে ওই টেস্টের নিচে দেখা যাবে। `testFailed(testInfo)` জানায় টেস্টটি প্রত্যাশিত
অবস্থায় শেষ হয়েছে কি না (`test.fail()` মার্ক করা টেস্টও সঠিকভাবে ধরে)।

### ১২.৫ Files (`framework/utils/fileUtils.js`)

`ensureDir`, `exists`, `readJson/writeJson`, `readText/writeText`, `removeFile`, `cleanDir`,
`listFiles`, `fileAgeInMinutes` (সেশনের মেয়াদ হিসাব), `uniqueFileName`,
`uploadFilePath` (ফাইল না থাকলে সহায়ক এরর), `downloadsDir`।

### ১২.৬ Paths (`framework/utils/paths.js`)

পুরো কোডবেসে **একমাত্র** জায়গা যেখানে `import.meta.url` দিয়ে পাথ বানানো হয়। সব আউটপুট
ডিরেক্টরির ঠিকানা (`reports/html`, `reports/junit`, `.auth`, `assets/upload`…) এখানেই।
নতুন কোথাও পাথ দরকার হলে `PATHS`/`fromRoot()` ব্যবহার করুন, নিজে বানাবেন না।

### ১২.৭ Clean স্ক্রিপ্ট (`scripts/clean.js`)

```bash
npm run clean         # reports/, test-results/, playwright-report/, downloads/ মুছে দেয়
npm run clean:auth    # শুধু .auth/ (সেভ করা সেশন)
npm run clean:all     # দুটোই
npm run clean:dry     # কী কী মুছবে শুধু দেখায়, মুছবে না
```

যা মোছে সবই git-ignored ও পুনরায় তৈরি হয় — তাই নিরাপদ।

---

## ১৩. টেস্ট লেখার নিয়ম ও প্যাটার্ন

### ১৩.১ একটি স্পেকের কঙ্কাল

```js
import { test, expect } from '../../src/fixtures.js'; // ← সবসময় এখান থেকে
import { messages } from '../../src/data/index.js';
import { anonymousState } from '../../framework/index.js';

test.use({ storageState: anonymousState }); // ফাইল-লেভেল সেশন নীতি

test.describe('Login', { tag: ['@smoke', '@auth'] }, () => {
  test.beforeEach(async ({ pages }) => {
    await pages.loginPage.goto();
  });

  test('invalid credentials are rejected', async ({ pages }) => {
    await pages.loginPage.login({ username: 'x@y.com', password: 'wrong' });
    await pages.loginPage.expectErrorMessage(messages.login.invalidCredentials);
  });
});
```

**নিয়ম:** `@playwright/test` থেকে সরাসরি `test` ইমপোর্ট করবেন **না** — তাহলে সব fixture
হারাবেন। সবসময় `src/fixtures.js`।

### ১৩.২ ট্যাগ ব্যবস্থা

| ট্যাগ         | অর্থ                                         |
| ------------- | -------------------------------------------- |
| `@smoke`      | দ্রুত, সবচেয়ে জরুরি পথ — প্রতি ডিপ্লয়ে চলে |
| `@regression` | পূর্ণ কভারেজ — নাইটলি                        |
| `@critical`   | ব্যবসায়িকভাবে সবচেয়ে গুরুত্বপূর্ণ          |
| `@auth`       | লগইন/সেশন নির্ভর                             |
| `@api`        | API স্তরের টেস্ট                             |
| `@multi-role` | একাধিক রোল একসাথে                            |

চালানো: `npm run test:smoke`, বা `npx playwright test --grep "@smoke|@critical"`,
বা বাদ দিতে `--grep-invert @slow`।

### ১৩.৩ Hooks-এর ব্যবহার

```js
test.beforeAll(async ({ logger }) => {}); // সুইট শুরুর আগে একবার
test.beforeEach(async ({ pages }) => {}); // প্রতিটি টেস্টের আগে (নেভিগেশন এখানে)
test.afterEach(async ({ logger }, testInfo) => {}); // প্রতিটি টেস্টের পরে (ক্লিনআপ)
test.afterAll(async ({ logger }) => {});
```

### ১৩.৪ শর্তসাপেক্ষ Skip — ফ্রেমওয়ার্কের নিজস্ব প্যাটার্ন

পরিবেশে ডেটা/ক্রেডেনশিয়াল না থাকলে **ফেল করার বদলে skip** করুন:

```js
test.skip(!config.users.standard?.password, 'No credentials. Configure STANDARD_USERNAME…');
test.skip(!exists(storageStatePath('standard')), 'No stored session.');
```

এতে CI মিথ্যা-লাল (false red) হয় না, অথচ ক্রেডেনশিয়াল দিলেই টেস্টটি আসলেই চলে।

### ১৩.৫ সমান্তরালতা ও আইসোলেশন

- `fullyParallel: true` — ফাইল ও ফাইলের ভেতরের টেস্ট দুটোই সমান্তরাল
- প্রতিটি টেস্ট **নতুন BrowserContext** পায় — কুকি/স্টোরেজ শেয়ার হয় না
- ক্রমনির্ভর টেস্ট থাকলে: `test.describe.serial('...', () => {...})`
- একই ডেটা দুই টেস্ট একসাথে বদলালে সমস্যা — তাই `dataFactory` দিয়ে **ইউনিক ডেটা** ব্যবহার করুন

### ১৩.৬ কী করবেন না

| ❌ ভুল                                  | ✅ সঠিক                                              |
| --------------------------------------- | ---------------------------------------------------- |
| `await page.waitForTimeout(3000)`       | `await this.waitForVisible(locator)`                 |
| টেস্টে `page.locator('.btn-x').click()` | `pages.somePage.submitOrder()`                       |
| টেস্টে হার্ডকোড পাসওয়ার্ড              | `config.users.standard`                              |
| টেস্টে `process.env.BASE_URL`           | `config.baseURL`                                     |
| স্থির ইমেইল `test@test.com`             | `data.email()`                                       |
| `expect(x).toBe(true)` (বার্তাহীন)      | ব্যবসায়িক অ্যাসারশন `expectRegistrationSucceeded()` |

---

## ১৪. টেস্ট চালানো — সব কমান্ড

### ১৪.১ মৌলিক

```bash
npm test                      # সব প্রজেক্ট, TEST_ENV=dev
npm run test:headed           # ব্রাউজার দেখতে দেখতে
npm run test:debug            # Playwright Inspector (স্টেপ বাই স্টেপ)
npm run test:ui-mode          # UI Mode — সবচেয়ে ভালো ডিবাগ অভিজ্ঞতা
```

### ১৪.২ প্রজেক্ট অনুযায়ী

```bash
npm run test:chromium
npm run test:firefox
npm run test:webkit
npm run test:mobile           # Pixel 7 ভিউপোর্ট
npm run test:ui               # তিনটি ডেস্কটপ ব্রাউজার একসাথে
npm run test:api              # ব্রাউজার ছাড়া API টেস্ট
```

### ১৪.৩ নির্দিষ্ট ফাইল/টেস্ট

```bash
npx playwright test tests/ui/login.spec.js
npx playwright test tests/ui/login.spec.js:19          # লাইন নম্বর ধরে একটি টেস্ট
npx playwright test -g "valid user can sign in"        # নাম ধরে
npm run test:chromium -- tests/ui/login.spec.js        # স্ক্রিপ্টে আর্গুমেন্ট পাস
```

### ১৪.৪ ট্যাগ ও environment

```bash
npm run test:smoke
npm run test:regression
npm run test:tag "@critical"
npm run test:staging
npm run test:smoke:staging
```

### ১৪.৫ এক্সিকিউশন নিয়ন্ত্রণ

```bash
npm run test:serial          # --workers=1 (ফ্লেকি ডিবাগে সহায়ক)
npm run test:parallel        # --workers=4
npm run test:retry           # --retries=2
npm run test:failed          # --last-failed (শুধু আগেরবার ফেল করা টেস্ট)
```

### ১৪.৬ অন্যান্য

```bash
npm run report               # HTML রিপোর্ট খোলে
npm run trace <path.zip>     # ট্রেস ভিউয়ার
npm run codegen <url>        # ব্রাউজারে ক্লিক করে কোড জেনারেট
npm run auth:refresh         # সেশন নতুন করে তৈরি
npm run lint                 # ESLint
npm run format               # Prettier দিয়ে ফরম্যাট
npm run format:check         # ফরম্যাট যাচাই (CI-তে এটি চলে)
```

---

## ১৫. রিপোর্ট, আর্টিফ্যাক্ট ও ডিবাগিং

### ১৫.১ রান শেষে `reports/` ফোল্ডারে যা থাকে

```
reports/
├── html/            ← npm run report দিয়ে খুলুন (প্রধান রিপোর্ট)
├── json/results.json
├── junit/results.xml    ← CI/টেস্ট ম্যানেজমেন্ট টুলের জন্য
├── logs/test-run.log    ← সম্পূর্ণ টেক্সট লগ
├── screenshots/         ← ম্যানুয়ালি নেওয়া স্ক্রিনশট
├── downloads/           ← ডাউনলোড টেস্টে সেভ হওয়া ফাইল
└── artifacts/           ← ফেল হওয়া টেস্টের screenshot/video/trace
```

### ১৫.২ ফেল হলে কী কী পাবেন

| আর্টিফ্যাক্ট                 | কী বলে                                             |
| ---------------------------- | -------------------------------------------------- |
| স্ক্রিনশট (full page)        | ফেল হওয়ার মুহূর্তে স্ক্রিন কেমন ছিল               |
| ভিডিও                        | পুরো টেস্টের রেকর্ডিং                              |
| **Trace**                    | প্রতিটি অ্যাকশনের DOM স্ন্যাপশট, নেটওয়ার্ক, কনসোল |
| `test-log.txt`               | ফ্রেমওয়ার্কের ধাপে ধাপে লগ                        |
| `browser-console-errors.txt` | ব্রাউজারের JS এরর (প্রায়ই আসল কারণ)               |
| `error-context.md`           | Playwright-এর পেজ স্ন্যাপশট                        |

### ১৫.৩ ডিবাগ করার ধাপ (সুপারিশকৃত ক্রম)

1. **টার্মিনাল লগ পড়ুন** — `> Login as X` ধাপগুলো কোথায় থেমেছে?
2. **HTML রিপোর্ট খুলুন** (`npm run report`) → ফেল টেস্টে ক্লিক
3. **Trace খুলুন** — টাইমলাইনে অ্যাকশন ধরে ধরে দেখুন, "Before/After" DOM মিলিয়ে দেখুন
4. **UI Mode**-এ পুনরায় চালান (`npm run test:ui-mode`) — watch mode, লাইভ লোকেটার পিকার
5. এখনো বুঝতে না পারলে `npm run test:debug` — Inspector-এ ধাপে ধাপে
6. **ফ্লেকি সন্দেহ হলে** `npm run test:serial` দিয়ে চালিয়ে দেখুন — পাস করলে সেটি
   সমান্তরালতা/শেয়ার্ড ডেটার সমস্যা

### ১৫.৪ লোকেটার লেখার অগ্রাধিকার

1. `getByRole('button', { name: /log in/i })` — ব্যবহারকারী যেভাবে দেখে
2. `getByLabel()`, `getByPlaceholder()`, `getByText()`
3. `getByTestId()` — ডেভেলপারের সাথে কথা বলে `data-testid` যোগ করান
4. `input[name="username"]` — স্থিতিশীল অ্যাট্রিবিউট (এই প্রজেক্টে ব্যবহৃত)
5. ❌ CSS ক্লাস চেইন / XPath — Tailwind ক্লাস বদলালেই ভেঙে যাবে

---

## ১৬. CI/CD — GitHub Actions

**ফাইল:** `.github/workflows/playwright.yml`

### ১৬.১ কখন চলে

| ট্রিগার                  | TEST_ENV        | উদ্দেশ্য                           |
| ------------------------ | --------------- | ---------------------------------- |
| `push` (main/master)     | `dev`           | প্রতিটি কমিটে যাচাই                |
| `pull_request`           | `dev`           | মার্জের আগে যাচাই                  |
| `schedule` (রাত ২টা UTC) | `staging`       | নাইটলি রিগ্রেশন                    |
| `workflow_dispatch`      | আপনি বেছে দিবেন | ম্যানুয়াল রান (env + tag ফিল্টার) |

### ১৬.২ জব কাঠামো

```
lint (ESLint + Prettier)          ← আগে চলে, ফেল করলে টেস্ট চলবেই না
   └── test (ম্যাট্রিক্স, fail-fast: false)
        ├── api             (ব্রাউজার নেই)
        ├── chromium        (chromium)
        ├── firefox         (firefox + chromium ← setup-এর জন্য)
        ├── webkit          (webkit + chromium ← setup-এর জন্য)
        └── mobile-chrome   (chromium)
```

প্রতিটি শার্ড শেষে `reports/` আপলোড হয় (৩০ দিন) এবং JUnit ফলাফল চেক হিসেবে প্রকাশ পায়।

### ১৬.৩ Secrets ও Variables সেটআপ

GitHub → রিপো → **Settings → Secrets and variables → Actions**:

| ধরন      | নাম                                      | দরকার              |
| -------- | ---------------------------------------- | ------------------ |
| Variable | `BASE_URL`, `API_BASE_URL`               | ঐচ্ছিক ওভাররাইড    |
| Secret   | `STANDARD_USERNAME`, `STANDARD_PASSWORD` | auth টেস্ট চালাতে  |
| Secret   | `ADMIN_USERNAME`, `ADMIN_PASSWORD`       | admin টেস্ট চালাতে |

সেট না করলেও CI ভাঙবে না — খালি ভ্যালু "সেট করা হয়নি" ধরা হয়, `.env.<env>` ফাইলের ভ্যালু
কাজ করে, এবং auth-নির্ভর টেস্ট skip হয়।

### ১৬.৪ CI ফেলের ইতিহাস থেকে শেখা (গুরুত্বপূর্ণ)

এই রিপোর প্রথম ১২টি CI রানই ফেল করেছিল। কারণ ও শিক্ষা:

1. **খালি স্ট্রিং ≠ অনুপস্থিত।** Actions `env:` ব্লকের সব কী এক্সপোর্ট করে; সেট না করা
   `vars.BASE_URL` → `BASE_URL=""`। কোড `undefined` চেক করায় খালি ভ্যালু `.env` ফাইলকে ঢেকে
   দিয়েছিল → প্রতিটি জব কনফিগ লোডেই ক্র্যাশ করত (এমনকি ব্রাউজারহীন `api` জবও)।
   **শিক্ষা:** কনফিগ লোডারে খালি ভ্যালুকে "নেই" ধরুন।
2. **প্রজেক্ট ডিপেন্ডেন্সির ব্রাউজারও ইনস্টল করতে হয়।** `firefox` শার্ডে শুধু firefox
   ইনস্টল হচ্ছিল, কিন্তু `setup` প্রজেক্ট chromium-এ চলে। **শিক্ষা:** শার্ডিংয়ের সময়
   dependency চেইনের সব ব্রাউজার হিসেব করুন।
3. **ক্রেডেনশিয়াল-নির্ভর টেস্টে গার্ড দিন** — নইলে CI স্থায়ীভাবে লাল থাকে এবং দলে
   "লাল CI স্বাভাবিক" সংস্কৃতি তৈরি হয়।

### ১৬.৫ এখনো মনোযোগ প্রয়োজন

- `.env.staging`-এর `staging.letsvibebd.com` **DNS-এ রেজলভ করে না** — তাই নাইটলি রান
  পাস করা সম্ভব নয়। হয় হোস্টটি চালু করুন, নয়তো `.env.staging` ঠিক করুন, নয়তো রিপো
  ভ্যারিয়েবল `BASE_URL`/`API_BASE_URL` সেট করুন।
- `tests/ui/registration.spec.js` প্রতিটি রানে **আসল সাইটে সত্যিকারের অ্যাকাউন্ট তৈরি করে**।
  প্রোডাকশনে এটি ঝুঁকিপূর্ণ — টেস্ট এনভায়রনমেন্টে সরান অথবা ট্যাগ দিয়ে সীমিত করুন।

---

## ১৭. ধাপে ধাপে রেসিপি

### ১৭.১ নতুন Page Object যোগ করা

**ধাপ ১** — `src/pages/ProfilePage.js`:

```js
import { BasePage } from '../../framework/core/BasePage.js';

export class ProfilePage extends BasePage {
  constructor(page, deps) {
    super(page, deps);
    this.path = '/profile';

    this.nameInput = page.getByLabel(/full name/i);
    this.saveButton = page.getByRole('button', { name: /save/i });
    this.successToast = page.locator('.Toastify__toast--success');

    this.identifier = this.nameInput;
  }

  async updateName(name) {
    this.logger.step(`Update profile name to "${name}"`);
    await this.fill(this.nameInput, name);
    await this.click(this.saveButton);
    return this;
  }

  async expectSaved() {
    await this.expectVisible(this.successToast);
    return this;
  }
}
```

**ধাপ ২** — `src/pages/index.js`-এ রেজিস্টার করুন:

```js
import { ProfilePage } from './ProfilePage.js';
export const pageObjects = { LoginPage, RegistrationPage, DashboardPage, ProfilePage };
export { LoginPage, RegistrationPage, DashboardPage, ProfilePage };
```

**ধাপ ৩** — সাথে সাথেই ব্যবহারযোগ্য:

```js
test('user can update the profile name', async ({ pages, data }) => {
  await pages.profilePage.goto();
  await pages.profilePage.updateName(data.user().fullName);
  await pages.profilePage.expectSaved();
});
```

### ১৭.২ নতুন রোল যোগ করা

```dotenv
# config/environments/.env.local
MANAGER_USERNAME=manager@example.com
MANAGER_PASSWORD=Secret123
```

ব্যস — কোনো কোড লাগবে না। `setup` প্রজেক্ট নিজেই এই রোলে লগইন করে সেশন সেভ করবে, এবং
`loginAs('manager')` / `authState('manager')` কাজ করবে।

### ১৭.৩ নতুন API Service যোগ করা

```js
// src/api/services/OrderService.js
export class OrderService {
  constructor(api) {
    this.api = api;
    this.resource = '/orders';
  }
  list() {
    return this.api.get(this.resource, { expectStatus: 200 });
  }
  create(payload) {
    return this.api.post(this.resource, { data: payload, expectStatus: [200, 201] });
  }
}
```

```js
// src/api/index.js
export { UserService } from './services/UserService.js';
export { OrderService } from './services/OrderService.js';
```

### ১৭.৪ নতুন environment যোগ করা (যেমন `qa`)

1. `framework/config/environment.js`-এ `SUPPORTED_ENVIRONMENTS`-এ `'qa'` যোগ করুন
2. `config/environments/.env.qa` তৈরি করুন (`.env.example` কপি করে)
3. চালান: `cross-env TEST_ENV=qa npm test`

### ১৭.৫ নতুন কম্পোনেন্ট যোগ করা

```js
// src/pages/components/ProductCard.js
import { BaseComponent } from '../../../framework/core/BaseComponent.js';

export class ProductCard extends BaseComponent {
  constructor(page, root = '[data-testid="product-card"]', deps = {}) {
    super(page, root, deps);
    this.title = this.getByTestId('product-title');
    this.addToCart = this.getByRole('button', { name: /add to cart/i });
  }
}
```

```js
const secondCard = new ProductCard(page).nth(1); // দ্বিতীয় কার্ড
await secondCard.click(secondCard.addToCart);
```

---

## ১৮. সমস্যা ও সমাধান

| লক্ষণ / এরর                                             | কারণ                                        | সমাধান                                                             |
| ------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| `Missing required environment variable(s) [BASE_URL]`   | `.env.<env>` নেই বা খালি, অথবা env var খালি | `config/environments/.env.<env>` বা `.env.local`-এ `BASE_URL` দিন  |
| `Unknown TEST_ENV "xyz"`                                | ভুল environment নাম                         | `dev`, `staging`, `prod` — বা `SUPPORTED_ENVIRONMENTS`-এ যোগ করুন  |
| `Unknown page object "profilePage"`                     | `src/pages/index.js`-এ রেজিস্টার করা হয়নি  | `pageObjects`-এ ক্লাসটি যোগ করুন                                   |
| `No credentials for role "admin"`                       | `ADMIN_USERNAME/PASSWORD` নেই               | `.env.local`-এ যোগ করুন                                            |
| `No stored session for role "standard"`                 | `setup` প্রজেক্ট চলেনি                      | `npm run auth:refresh`, অথবা ক্রেডেনশিয়াল সেট করুন                |
| `Executable doesn't exist … playwright install`         | ব্রাউজার ইনস্টল নেই                         | `npx playwright install --with-deps`                               |
| `Test timeout of 60000ms exceeded`                      | এলিমেন্ট আসেনি / পেজ ধীর                    | Trace দেখুন; লোকেটার ঠিক করুন; `TEST_TIMEOUT_MS` বাড়ান            |
| `strict mode violation: locator resolved to N elements` | লোকেটার একাধিক এলিমেন্টে মিলছে              | `.first()`, `.nth()` বা কম্পোনেন্ট দিয়ে scope সীমিত করুন          |
| টেস্ট লোকালে পাস, CI-তে ফেল                             | টাইমিং/ভিউপোর্ট/ডেটা ভিন্নতা                | CI-এর trace ডাউনলোড করুন; `--workers=1` দিয়ে যাচাই করুন           |
| একই টেস্ট কখনো পাস কখনো ফেল (flaky)                     | শেয়ার্ড ডেটা / রেস কন্ডিশন                 | `dataFactory` দিয়ে ইউনিক ডেটা; `describe.serial`; হার্ড wait সরান |
| `p.text-red-500` না পাওয়া                              | অ্যাপের markup বদলেছে                       | page object-এ লোকেটার হালনাগাদ করুন (এক জায়গায়)                  |
| Prettier/ESLint ফেল (CI-এর `lint` জব)                   | ফরম্যাট মেলেনি                              | `npm run format` ও `npm run lint:fix` চালান                        |

---

## ১৯. SQA হিসেবে মেনে চলার নিয়ম

1. **টেস্ট পড়তে হবে গল্পের মতো।** স্পেকে শুধু ব্যবসায়িক ধাপ; সব প্রযুক্তিগত বিবরণ page
   object-এ।
2. **এক টেস্ট = এক আচরণ যাচাই।** একটি টেস্টে ৫টি অসংশ্লিষ্ট জিনিস পরীক্ষা করবেন না — ফেল
   করলে কারণ খুঁজে পাওয়া কঠিন হয়।
3. **প্রতিটি টেস্ট স্বয়ংসম্পূর্ণ।** অন্য টেস্টের রেখে যাওয়া অবস্থার উপর নির্ভর করবেন না।
4. **ডেটা তৈরি করুন, খুঁজবেন না।** "ডাটাবেসে থাকা ইউজার" ধরে নেওয়া টেস্ট একদিন ভাঙবেই।
5. **সেটআপ API দিয়ে, যাচাই UI দিয়ে।** দ্রুত ও কম ফ্লেকি।
6. **হার্ড wait নিষিদ্ধ।** `waitForTimeout` দেখলেই বুঝবেন কোথাও একটা লোকেটার/কন্ডিশন ভুল।
7. **ফ্লেকি টেস্ট = বাগ।** রিট্রাই দিয়ে ঢেকে না রেখে কারণ বের করুন (Trace আছে!)।
8. **পাসওয়ার্ড কখনো কোডে নয়** — `.env.local` বা CI secret; লগে `{ mask: true }`।
9. **প্রোডাকশনে কেবল read-only/smoke।** `.env.prod`-এর মন্তব্যেও এটি লেখা আছে।
10. **CI লাল থাকলে সাথে সাথে ঠিক করুন।** লাল CI-তে অভ্যস্ত দল আসল বাগ ধরতে পারে না।
11. **লোকেটার পরিবর্তন এক জায়গায়** — সেটাই POM-এর মূল লাভ; একই সিলেক্টর দুই ফাইলে থাকলে
    বুঝবেন ডিজাইন ভুল হয়েছে।
12. **কমিটের আগে** `npm run lint && npm run format:check && npm run test:smoke` চালান।

---

## ২০. দ্রুত রেফারেন্স

### টেস্টে যা যা পাওয়া যায়

```js
test('...', async ({ page, pages, config, data, api, logger, loginAs, newUser }) => {});
```

| Fixture   | সবচেয়ে ব্যবহৃত উদাহরণ                            |
| --------- | ------------------------------------------------- |
| `pages`   | `pages.loginPage.login(user)`                     |
| `config`  | `config.baseURL`, `config.users.admin`            |
| `data`    | `data.email()`, `data.user()`                     |
| `api`     | `api.get('/users', { expectStatus: 200 })`        |
| `logger`  | `logger.step('Checkout started')`                 |
| `loginAs` | `const p = await loginAs('admin')`                |
| `newUser` | রেজিস্ট্রেশন-উপযোগী ইউনিক ডেটা (প্রজেক্ট fixture) |

### সবচেয়ে বেশি লাগে যে কমান্ডগুলো

```bash
npm test                                  # সব
npm run test:smoke                        # দ্রুত যাচাই
npm run test:chromium -- tests/ui/login.spec.js
npm run test:ui-mode                      # ডিবাগ
npm run report                            # রিপোর্ট
npm run clean                             # আউটপুট পরিষ্কার
npm run auth:refresh                      # সেশন নতুন করে
```

### ইমপোর্ট চিটশিট

```js
import { test, expect } from '../../src/fixtures.js'; // সব স্পেকে
import { authState, anonymousState } from '../../framework/index.js'; // সেশন
import { messages, invalidUser, registrationData } from '../../src/data/index.js'; // ডেটা
import { TIMEOUTS } from '../../framework/index.js'; // টাইমআউট ধ্রুবক
import { BasePage } from '../../framework/core/BasePage.js'; // নতুন পেজ অবজেক্টে
import { BaseComponent } from '../../framework/core/BaseComponent.js'; // নতুন কম্পোনেন্টে
```

### একটি টেস্ট রানের জীবনচক্র

```
npm test
  └── playwright.config.js লোড → getConfig() → .env পড়া + ভ্যালিডেশন
       └── setup প্রজেক্ট → রোলভেদে লগইন → .auth/<env>-<role>.json
            └── UI প্রজেক্টগুলো (chromium/firefox/webkit/mobile) সমান্তরালে
                 ├── প্রতি টেস্টে: নতুন context → fixtures তৈরি → testLifecycle লগ
                 ├── pages.<page> লেজি তৈরি → অ্যাকশন → অ্যাসারশন
                 └── ফেল হলে: screenshot + video + trace + লগ + কনসোল এরর অ্যাটাচ
            └── api প্রজেক্ট (ব্রাউজার ছাড়া) সমান্তরালে
       └── রিপোর্ট লেখা: reports/html, reports/json, reports/junit
```

---

**ডকুমেন্ট সংস্করণ:** ১.০ · **সর্বশেষ হালনাগাদ:** ৩০ আগস্ট ২০২৬
**সম্পর্কিত ফাইল:** [`README.md`](../README.md) (ইংরেজি রেফারেন্স) ·
[`.github/workflows/playwright.yml`](../.github/workflows/playwright.yml) (CI)
