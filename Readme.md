<div align="center">

# QA AI Framework

Playwright + TypeScript automation framework with AI-agent support, credential encryption, Excel/Confluence → Markdown migration, and built-in step tracing.

[Playwright Docs](https://playwright.dev/docs/intro) · [TypeScript](https://www.typescriptlang.org/) · [ESLint](https://eslint.org/) · [Prettier](https://prettier.io/) · [Husky](https://typicode.github.io/husky/)

</div>

---

## Table of Contents

1. [Features Overview](#features-overview)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Project Structure](#project-structure)
6. [Environments & Configuration](#environments--configuration)
7. [Credential Encryption](#credential-encryption)
8. [Running Tests](#running-tests)
9. [Interactive Custom Test Runner](#interactive-custom-test-runner)
10. [Tagging Strategy](#tagging-strategy)
11. [Page Object Model](#page-object-model)
12. [Step Decorator](#step-decorator)
13. [Confluence → Markdown](#confluence--markdown)
14. [Excel → Markdown](#excel--markdown)
15. [Custom HTML Reporting](#custom-html-reporting)
16. [Logging](#logging)
17. [Code Quality](#code-quality)
18. [CI/CD](#cicd)
19. [AI Agent & MCP Integration](#ai-agent--mcp-integration)
20. [Troubleshooting](#troubleshooting)

---

## Features Overview

| Area | Capability |
| --- | --- |
| Test Types | UI, API, E2E |
| Architecture | Page Object Model with `BasePage`, typed fixtures, shared utilities |
| Step Tracing | `@Step()` decorator auto-wraps page methods in `test.step()` for trace visibility |
| Credential Encryption | AES-256-GCM encryption for `.env` credentials; auto-decrypted at test startup |
| Requirements Migration | Confluence pages and Excel files (`.xlsx`/`.xls`/`.csv`) → English Markdown |
| Environment Handling | Per-environment `.env` files with `loadEnv()` + `validateEnv()` |
| Interactive Runner | CLI to select env, browser, test type, tag, and mode |
| Reporting | Playwright HTML report + custom consolidated HTML with JIRA bug-creation links |
| Logging | File + console logger with automatic secret redaction |
| CI | GitHub Actions (tests + code quality) and Jenkins pipeline (Docker) |
| Code Quality | Prettier, ESLint, TypeScript strict, Husky + lint-staged |

---

## Tech Stack

- `@playwright/test` — browser automation and test runner
- TypeScript 5 (strict mode)
- Node.js LTS
- `exceljs` — Excel file parsing
- `turndown` — HTML to Markdown conversion
- `dotenv` + `cross-env` — environment variable management
- `inquirer` — interactive CLI runner
- `axios` — HTTP client (API tests + translation)
- Prettier, ESLint, Husky + lint-staged — code quality gates
- GitHub Actions, Jenkins — CI/CD

---

## Prerequisites

- Node.js (LTS) — [nodejs.org](https://nodejs.org/en/download)
- Git

```bash
git --version
node -v
npm -v
```

---

## Quick Start

```bash
git clone https://github.com/ricpathak/qa-aiframework.git
cd qa-aiframework
npm run setup          # installs deps, Playwright browsers, and builds MCP server
npm run test           # run all tests headless
npm run test:custom    # interactive runner
```

After a test run:

```bash
npm run test:report:playwright   # open Playwright HTML report
npm run test:report:custom       # open custom consolidated report
```

---

## Project Structure

```
├── playwright.config.ts
├── tsconfig.json
├── Jenkinsfile
├── environments/
│   ├── example.env          # reference template — committed with blank credentials
│   ├── local.env            # local dev — fill in your values
│   ├── dev.env
│   └── qa.env
├── utils/
│   ├── configuration.ts     # central config: TAGS, ENVIRONMENTS, BROWSERS, JIRA constants
│   ├── env-loader.ts        # loadEnv(), validateEnv(), auto-decrypt enc: values
│   ├── crypto-helper.ts     # AES-256-GCM encryptValue / decryptValue
│   ├── encrypt-credentials.ts  # CLI: encrypt credential keys in .env files
│   ├── translate.ts         # shared Japanese detection + Google Translate utility
│   ├── confluence-to-md.ts  # fetch Confluence page → English Markdown
│   ├── excel-to-md.ts       # convert Excel/CSV files → English Markdown
│   ├── step-decorator.ts    # @Step() decorator for page-level test.step() tracing
│   ├── custom-reporter.ts   # custom HTML report with JIRA integration
│   └── run-custom-tests.ts  # interactive Inquirer CLI runner
└── src/
    ├── pages/
    │   ├── ui/
    │   │   ├── base-page.ts       # BasePage with shared assertions + step() helper
    │   │   ├── auth-page.ts       # login page object (reads APP_USERNAME/APP_PASSWORD)
    │   │   ├── home-page.ts
    │   │   └── todo-page.ts
    │   └── api/
    │       └── user-page.ts
    ├── shared/
    │   ├── mock-data/             # test data
    │   ├── types/                 # reusable TypeScript types
    │   └── utils/
    │       └── custom-logger.ts   # Logger class with secret redaction
    └── tests/
        ├── ui/
        │   ├── fixtures/
        │   │   ├── home-fixture.ts
        │   │   ├── todo-fixture.ts
        │   │   └── authenticated-fixture.ts   # pre-login fixture
        │   ├── home.spec.ts
        │   └── todo.spec.ts
        └── api/
            └── user.spec.ts
```

---

## Environments & Configuration

Each environment has a `.env` file under `environments/`. All four files (`example`, `local`, `dev`, `qa`) are committed as blank-value templates so the team knows which variables to set.

`playwright.config.ts` loads the correct file at startup:

```typescript
loadEnv(process.env.NODE_ENV ?? "example");
```

**Key variables:**

```env
APP_BASE_URL=https://your-app.example.com
APP_LOGIN_URL=https://your-app.example.com/login
APP_USERNAME=your-username
APP_PASSWORD=your-password

CONFLUENCE_BASE_URL=https://your-domain.atlassian.net
CONFLUENCE_USERNAME=user@example.com
CONFLUENCE_PASSWORD=your-api-token-or-password

# SECRET_KEY — set in your shell or CI secrets, never in this file
# export SECRET_KEY=your-master-key
```

**`validateEnv()`** — call before tests run to assert required variables are present:

```typescript
import { validateEnv } from "@utils/env-loader";
validateEnv(["APP_BASE_URL", "APP_USERNAME", "APP_PASSWORD"]);
```

---

## Credential Encryption

Credentials in `.env` files can be encrypted at rest using AES-256-GCM. The `SECRET_KEY` master key is set in your shell or CI secrets — never committed.

### Encrypt credentials in an env file

```bash
export SECRET_KEY=your-master-key
npm run credentials:encrypt -- environments/qa.env
```

Credential values (any key containing `PASSWORD`, `TOKEN`, `SECRET`, `USERNAME`, etc.) are encrypted in-place:

```env
# Before
APP_PASSWORD=mysecret

# After
APP_PASSWORD=enc:a1b2c3...:d4e5f6...:789abc...
```

### Verify encrypted values

```bash
SECRET_KEY=your-master-key npm run credentials:verify -- environments/qa.env
```

### At test startup

`env-loader.ts` automatically decrypts any `enc:` prefixed value when the environment is loaded. Tests and page objects read `process.env.APP_PASSWORD` as normal — the encrypted form is never visible to test code.

```bash
# Run QA tests with encrypted credentials
SECRET_KEY=your-master-key npm run test:qa
```

### In CI (GitHub Actions / Jenkins)

Set `SECRET_KEY` as a repository secret or Jenkins credential binding. The runner exports it to the environment before tests start — no changes needed in the test code.

---

## Running Tests

| Script | Purpose |
| --- | --- |
| `npm run test` | All tests, headless, default env |
| `npm run test:local` | Force `local` environment |
| `npm run test:dev` | Force `dev` environment |
| `npm run test:qa` | Force `qa` environment |
| `npm run test:headed` | Run with visible browser |
| `npm run test:ui` | Playwright UI mode |
| `npm run test:debug` | Debug mode with inspector |
| `npm run test:trace` | Enable trace collection |
| `npm run test:custom` | Interactive multi-select runner |
| `npm run test:report:playwright` | Open Playwright HTML report |
| `npm run test:report:custom` | Open custom consolidated report |
| `npm run credentials:encrypt` | Encrypt credential values in an env file |
| `npm run credentials:verify` | Verify encrypted values decrypt correctly |
| `npm run confluence:fetch` | Fetch a Confluence page → Markdown |
| `npm run excel:fetch` | Convert Excel/CSV files → Markdown |
| `npm run validate:generated` | CI quality gate for AI-generated test files |
| `npm run mcp:build` | Build the custom MCP server |
| `npm run mcp:start` | Start the custom MCP server |

---

## Interactive Custom Test Runner

```bash
npm run test:custom
```

Prompts you to choose:
- **Environment**: Local, Dev, QA
- **Browser**: Chromium, Firefox, WebKit (multi-select)
- **Test type**: UI, API, E2E
- **Test group**: Regression, Smoke, Customer, Internal
- **Mode**: Headless (default), Headed, UI, Debug

Builds and runs the Playwright command from your selections. Adding a new environment, browser, or tag is a one-line change in `utils/configuration.ts` — the runner picks it up automatically.

---

## Tagging Strategy

Tags are defined in `utils/configuration.ts`:

```typescript
export enum TAGS {
    REGRESSION = "@regression",
    SMOKE      = "@smoke",
    CUSTOMER   = "@customer",
    INTERNAL   = "@internal",
}
```

Apply to tests:

```typescript
test("checkout flow", { tag: [TAGS.REGRESSION, TAGS.CUSTOMER] }, async ({ page }) => { ... });
```

Filter from the CLI:

```bash
npx playwright test --grep "@smoke"
npx playwright test --grep "@regression|@smoke"
```

To add a new tag: add it to `TAGS`, add an entry to `TEST_GROUPS` in `configuration.ts`. It appears in the interactive runner automatically.

---

## Page Object Model

All UI pages extend `BasePage`:

```
BasePage
├── AuthPage       (login flows)
├── HomePage
└── TodoPage
```

**BasePage** provides shared assertion helpers and an inline step wrapper:

```typescript
// inline steps for complex methods
async fillForm(data: FormData) {
    await this.step("Fill form fields", async () => {
        await this.nameInput.fill(data.name);
        await this.emailInput.fill(data.email);
    });
}
```

**Fixtures** in `src/tests/ui/fixtures/` handle page setup and teardown, keeping spec files clean:

```typescript
// src/tests/ui/fixtures/authenticated-fixture.ts
export const test = base.extend<AuthFixture>({
    authPage: async ({ page }, use) => {
        const authPage = new AuthPage(page, process.env.APP_LOGIN_URL!);
        await authPage.loginWithEnvCredentials();
        await use(authPage);
    },
});
```

`AuthPage.loginWithEnvCredentials()` reads `APP_USERNAME` and `APP_PASSWORD` from the environment — credentials that were auto-decrypted from the `.env` file at startup.

---

## Step Decorator

`@Step()` wraps any async page object method in `test.step()` automatically, so every page method call appears as a named step in the Playwright trace viewer and HTML report — without any changes to spec files.

```typescript
import { Step } from "@utils/step-decorator";

export class CheckoutPage extends BasePage {

    @Step()
    async fillShippingAddress(address: Address) {
        await this.streetInput.fill(address.street);
        await this.cityInput.fill(address.city);
    }

    @Step("Proceed to payment")   // custom step name
    async clickContinue() {
        await this.continueButton.click();
    }

    @Step()
    async expectOrderConfirmed(orderId: string) {
        await this.expectToContainText(this.confirmationBanner, orderId);
    }
}
```

The result in the trace viewer:

```
▶ test.step("Complete checkout")         ← from spec (the scenario)
  ▶ CheckoutPage: fillShippingAddress    ← from @Step() (the action)
  ▶ Proceed to payment
  ▶ CheckoutPage: expectOrderConfirmed
```

All existing page objects (`HomePage`, `TodoPage`, `AuthPage`) already use `@Step()`.

---

## Confluence → Markdown

Fetches a Confluence page by ID, converts the HTML to Markdown, translates Japanese content to English, and writes a `.md` file with YAML frontmatter.

**Setup** — fill in your env file:

```env
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net
CONFLUENCE_USERNAME=user@company.com
CONFLUENCE_PASSWORD=your-api-token      # Confluence Cloud: use API token
```

**Run:**

```bash
npm run confluence:fetch -- <page-id>
npm run confluence:fetch -- <page-id> specs    # custom output directory
```

**Output** (`requirements/<page-title>.md`):

```markdown
---
title: "My Requirements Page"
source: https://your-domain.atlassian.net/pages/123456789
fetched: 2026-06-15
---

# My Requirements Page

... content in English ...
```

---

## Excel → Markdown

Reads `.xlsx`, `.xls`, or `.csv` files, converts each sheet to a Markdown table (or bullet list if no header row), translates Japanese content to English, and writes one `.md` file per workbook with YAML frontmatter.

**Run:**

```bash
# Single file
npm run excel:fetch -- ./data/testcases.xlsx

# Entire directory (processes all Excel/CSV files)
npm run excel:fetch -- ./data/excel-specs requirements
```

**Output** (`requirements/<filename>.md`):

```markdown
---
title: "Test Cases"
source: /absolute/path/to/testcases.xlsx
sheets: 3
converted: 2026-06-15
---

# Test Cases

## Sheet 1

| Test ID | Description       | Expected Result |
| ------- | ----------------- | --------------- |
| TC-001  | User can log in   | Dashboard shown |
...
```

Both utilities share the same translation module (`utils/translate.ts`) which detects Japanese characters and translates through Google Translate's public endpoint — no API key needed.

---

## Custom HTML Reporting

`utils/custom-reporter.ts` implements the Playwright `Reporter` interface:

- Donut chart summarising pass / fail / skipped counts
- Per-test step details, duration, and artifact links
- One-click **Create Bug** button per failure — opens a pre-filled JIRA issue using `JIRA_PROJECT_ID`, `JIRA_PROJECT_ISSUE_TYPE_ID`, and `JIRA_API_BASE_URL` from `configuration.ts`
- Two modes: simplified (local) and detailed (Jenkins)

Set real JIRA values in `utils/configuration.ts`:

```typescript
export const JIRA_PROJECT_ID = 10201;
export const JIRA_PROJECT_ISSUE_TYPE_ID = 10004;
export const JIRA_API_BASE_URL = "https://your-domain.atlassian.net";
```

Screenshots: `assets/custom-report.png`, `assets/custom-report-steps.png`, `assets/jenkins-dashboard.png`

---

## Logging

`src/shared/utils/custom-logger.ts` writes timestamped lines to console and `logs/automation.log`.

```typescript
Logger.info("Starting checkout flow");
Logger.warn("Retry attempt 2");
Logger.error("Element not found");
```

**Secret redaction** is built in — any message containing a live credential value (matched against env vars whose key contains `PASSWORD`, `TOKEN`, `SECRET`, etc.) has those values replaced with `***` before writing to any output.

---

## Code Quality

```bash
npm run prettier        # check formatting
npm run prettier:fix    # auto-fix formatting
npm run eslint          # lint
npm run eslint:fix      # lint + auto-fix
```

Husky runs Prettier + ESLint automatically on staged files at commit time (`lint-staged` config in `package.json`). The `npm run setup` command installs the hooks.

GitHub Actions `build.yml` runs Prettier check, ESLint, and `validate:generated` on every push and PR to `main`.

---

## CI/CD

### GitHub Actions

`.github/workflows/playwright.yml` — runs all Playwright tests on push/PR to `main`/`master`. Uploads Playwright report and custom report as artifacts (retained 30 days).

`.github/workflows/build.yml` — runs Prettier, ESLint, and `validate:generated` on push/PR to `main`.

Both workflows cache `node_modules` via `cache: 'npm'` on the `setup-node` step.

### Jenkins

`Jenkinsfile` — Docker-based pipeline using the official Playwright image:

1. Clean workspace
2. Checkout
3. Install deps + browsers
4. Inject credentials via Jenkins bindings (`SECRET_KEY` + app credentials)
5. Run tests
6. Publish custom HTML report

```bash
# Run locally in Docker
docker run --rm -v "$PWD":/app -w /app \
  mcr.microsoft.com/playwright:v1.56.0-noble \
  bash -c "npm ci && npx playwright test"
```

---

## AI Agent & MCP Integration

The framework supports an AI-driven test pipeline via Model Context Protocol (MCP). Four specialized agents in `.github/agents/` can plan, generate, execute, and heal tests autonomously.

### Agents

| Agent | File | Purpose |
| --- | --- | --- |
| Orchestrator | `playwright-test-orchestrator.agent.md` | Runs the full Plan → Generate → Execute → Heal pipeline |
| Planner | `playwright-test-planner.agent.md` | Explores a live URL and writes a test plan to `specs/` |
| Generator | `playwright-test-generator.agent.md` | Converts a plan scenario into a `.spec.ts` file |
| Healer | `playwright-test-healer.agent.md` | Debugs failing tests and applies minimal selector/timing fixes |

### MCP Servers

Registered in `.vscode/mcp.json`:

| Server | Purpose |
| --- | --- |
| `@playwright/mcp` | Browser automation tools |
| `playwright run-test-mcp-server` | Test lifecycle tools (run, debug, list) |
| `playwright-qa` (custom) | `get_test_failures`, `normalize_requirements`, `get_framework_conventions`, `record_heal_event` |

```bash
npm run mcp:build    # compile mcp-server/
npm run mcp:start    # run the custom server
```

### Governance documents

- [`AGENTS.md`](AGENTS.md) — agent roles, conventions, startup sequences, rules matrix
- [`CUSTOM-MCP.md`](CUSTOM-MCP.md) — custom MCP tools, why they exist, how to add more
- [`MAINTENANCE.md`](MAINTENANCE.md) — workflows for adding agents/tools, upgrading Playwright, troubleshooting

### Quick agent prompts

```text
# Planner
Create a test plan for https://your-app.example.com using requirements/my-requirements.md

# Generator
Generate a Playwright test from specs/my-plan.md for scenario "User can log in"

# Healer
Heal the failing test src/tests/ui/generated/login.spec.ts — only fix selectors or timing

# Orchestrator
Run the full QA pipeline for https://your-app.example.com using requirements/my-requirements.md
```

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `@utils/...` import fails | Missing tsconfig path mapping | Extend `paths` in `tsconfig.json` |
| Env vars undefined | Wrong `NODE_ENV` or missing file | Verify `<env>.env` exists and `NODE_ENV` matches |
| `SECRET_KEY` error at startup | Encrypted values in env but no key set | `export SECRET_KEY=your-key` before running |
| Decryption fails | Wrong `SECRET_KEY` | Run `credentials:verify` to diagnose |
| Custom report empty | Reporter not loaded | Check `playwright.config.ts` includes `./utils/custom-reporter` |
| JIRA button opens malformed page | Placeholder IDs still set | Replace constants in `configuration.ts` |
| Videos/traces missing | Test passed (artifacts only on failure) | Set `video: "on"` in `playwright.config.ts` for debugging |
| Husky not running | Git hooks not installed | Run `npm run setup` |
| Excel/Confluence translation skipped | No Japanese characters detected | Content is already English — no translation needed |
| MCP server not found | Extension does not support `.vscode/mcp.json` | Use a VS Code extension that supports MCP |
