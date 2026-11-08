# Ashley Playwright assignment

Playwright + TypeScript tests for the QA Automation Engineer home assignment.

| Area | Test | File |
| --- | --- | --- |
| UI | For each of the 7 sizes: Homepage -> Hero Banner "Shop Mattress" -> choose size -> add to cart -> verify the cart | `tests/ui/mattress-cart.spec.ts` |
| API | `GET /products?brand=awara` returns 200 and a non-empty `result.data` array | `tests/api/products.spec.ts` |
| API | `GET /products?name=the-awara-hybrid-mattress-30&lang=en&brand=awara` returns 200 and exactly one product | `tests/api/products.spec.ts` |

The tests never go to checkout and never place an order.

**Status:** on a developer machine the type check, lint and all 7 UI tests pass, and both API tests get HTTP 403 from Cloudflare. On GitHub Actions
every run fails, because the QA API's Cloudflare protection rejects most requests from GitHub's runners, including the browser's add-to-cart
call. See [Verification status](#verification-status) for the evidence and what would fix it.

## Prerequisites

Node.js 22.18 or newer (required by the Allure command-line tool; developed on Node 24, CI uses Node 24) and npm.

## Install

```bash
npm ci
npx playwright install chromium
```

On a bare Linux machine also install the browser's system libraries: `npx playwright install --with-deps chromium`.

## Run

| Command | What it does |
| --- | --- |
| `npm test` | All tests (UI and API projects) |
| `npm run test:ui` | UI project only (Chromium) |
| `npm run test:api` | API project only (no browser) |
| `npm run test:headed` | UI tests in a visible browser |
| `npm run test:debug` | UI tests in Playwright Inspector debug mode |
| `npm run typecheck` | `tsc --noEmit` with strict mode |
| `npm run lint` | ESLint with `typescript-eslint` and `eslint-plugin-playwright`; any warning fails it |
| `npm run report:allure` | Build the Allure report from the last run and open it |

Base URLs default to the assignment values and can be overridden with `UI_BASE_URL` (`https://qa.awarasleep.com`) and
`API_BASE_URL` (`https://api.qa-env.residenthome.com`), for example `UI_BASE_URL=https://example.test npm run test:ui`.

## Reports

Allure is the only report. Every run prints a list in the terminal and writes Allure results to `allure-results/`, which is cleared at the
start of each run. `npm run report:allure` builds `allure-report/index.html`, a single file that also opens with a double-click.

The report shows the `test.step` journey of each test. For a failed test it keeps the error, a screenshot and the error context of every
attempt, and a trace of the first failed attempt with every action, DOM snapshots, network and console (the filmstrip is left out to save
space). Download the trace from **Attachments** and open it with `npx playwright show-trace <trace.zip>`; after a retry, Allure opens the last
attempt first, so the trace is under **Retries**, the open icon on the earlier attempt's row, then **Attachments**.

## GitHub Actions

`.github/workflows/playwright.yml` runs on every push, on pull requests from forks and manually (`workflow_dispatch`). A pull request from a
branch of this repo is already tested by its push, so it does not run twice. The job installs dependencies and Chromium, type-checks, lints,
runs `npm test` (2 workers, 1 retry), builds the Allure report and uploads it as the `allure-report` artifact, kept for 14 days and uploaded
even when tests fail. To read it, open the workflow run, download `allure-report` under **Artifacts**, unzip it and open `index.html`.

## Structure

```
.github/workflows/playwright.yml   CI
pages/home.page.ts                 homepage: hero link
pages/mattress.page.ts             product page: name, size, add to cart
pages/cart.page.ts                 cart page: line items
controllers/products.controller.ts GET /products requests and schema check
schemas/products.schema.ts         GET /products body: types and JSON Schema
fixtures/api.fixture.ts            provides productsController to the API tests
fixtures/ui.fixture.ts             provides the page objects and popup cookies to the UI test
tests/ui/mattress-cart.spec.ts     UI scenario (one test per size, test.step phases)
tests/api/products.spec.ts         two independent API tests (productsController fixture)
playwright.config.ts               "ui" and "api" projects, timeouts, Allure reporter
global-setup.ts                    clears old Allure results before each run
allurerc.mjs                       Allure report settings
eslint.config.mjs                  lint rules, including the project's Playwright rules as errors
```

## Key decisions

- **Two projects.** `ui` (Chromium, UI base URL) and `api` (no browser). `testMatch` keeps each test in exactly one project.
- **User-Agent `E2EUI-Tests`.** Both projects send it, so requests from the browser and from the API client are marked as test traffic.
  In `ui` it is set after the device descriptor, which has its own User-Agent. Only that header changes: the browser's `sec-ch-ua`
  headers still name headless Chromium.
- **Readable UI test.** The test gets its page objects from fixtures and only calls their named methods. Locators and assertions
  live in the page objects, as `expect...` methods. `MattressPage` listens for pricing requests, so it must exist before the page loads;
  that is why the navigating `beforeEach` asks for `mattressPage`.
- **Hooks.** `beforeAll` checks once per worker that the site responds, so an outage fails with a clear message before any size test
  starts. `beforeEach` opens the homepage and goes to the product page, in the fresh browser context of each test.
- **Isolation.** Playwright creates a fresh browser context per test, so every test starts with an empty cart and only the popup cookies below.
- **Locators.** Role and test-id locators only. The hero link is scoped to `hero_content_container`, because the
  comparison table has another "Shop Mattress" link and the hero has hidden responsive duplicates.
- **Proof that the right item was added.** On the cart page the test expects exactly one line item, whose name equals the
  product title captured before adding, whose size line exactly equals the chosen size (for example `Size: King`), and whose quantity is `1`.
  A toast or cart counter is never the proof.
- **Adding to the cart.** The test only clicks "Add to Cart". The site saves the item (`POST /carts/my/items`) and, except for Split King, opens
  `/checkout/cart` by itself; the flow still passes with the save delayed by 8 s. The cart page later opens an Extend protection-plan dialog
  from a third-party script; the cart assertions do not need it closed, so the test ignores it.
- **Split King.** After "Add to Cart" the site shows a "Please Note" notice about shipping as two Twin XL mattresses and stays on the
  product page. The site opens this notice for every Split King, with no cookie or setting to turn it off. So this size has its own test, which
  never clicks "Proceed to Checkout": it waits for the header cart counter, which updates only after the item is saved, then opens the cart by URL.
  Its cart label is `Size: Split King (Ships in 2 Twin XL boxes)`.
- **Popups.** A cookie banner (about 2 s after load) and a promo modal (about 7 s) would block clicks, and an upsell dialog ("Upgrade to Certified
  Organic") would stop "Add to Cart" from saving the item until it is answered. The UI fixture sets cookies that stop all three, generated for each
  test, so the test never closes a popup:
  - `OptanonAlertBoxClosed` closes the OneTrust banner with only strictly necessary cookies active, like its "Close" button, so no consent is given.
  - `_dyjsession` and `_dy_soct` make Dynamic Yield treat the visit as an ongoing session, so it skips its first-visit campaigns, including the promo.
  - `sopuUpgrade` is where the site remembers the upsell offer it has shown; it then opens the dialog only for that offer and size, so a value naming
    no offer keeps it closed.

  The tests therefore do not cover the first-visit content or the upsell. These cookie formats are internal to the vendor and the site and may change:
  if the banner or promo returns, clicks fail as blocked; if the upsell returns, the cart never opens. Either way, the fixture is the place to fix it.
- **Timeouts.** A UI test takes 10-16 s on a developer machine. The test limit is 90 s because choosing the size may wait up to 45 s for the
  page's pricing requests. Assertions wait up to 15 s, because the cart opens only after the site saves the item. Clicks wait up to 15 s and
  page loads up to 30 s; in CI traces the slowest click took 2.1 s and the slowest page load 1.0 s.
- **API layer.** Tests send requests only through the `productsController` fixture. The controller returns the response unparsed, so each test
  checks the status before calling `json()`: a Cloudflare 403 is HTML and would otherwise fail as a JSON parse error. A failed status check names
  the URL, the status and who answered, for example `server: cloudflare` and the `cf-ray` id of the block.
- **API assertions.** After the status, the body is validated against a JSON Schema with Ajv, so a failure lists every violation. The response
  types exist only at compile time, and `JSONSchemaType` keeps the schema and types in sync. The schema requires the fields found on all 91
  products in a real `brand=awara` response and allows extra fields, so a new QA product that lacks one of them fails the test.
- **Lint.** `npm run lint` runs on CI after the type check. Missing `await`s on Playwright calls and other promises, `waitForTimeout`,
  `networkidle`, forced clicks, skipped or focused tests, and tests without assertions are errors. A call to a page-object `expect...` method
  counts as an assertion.
- **TypeScript 6.0, not 7.** `typescript-eslint` supports TypeScript up to 6.0, and the TypeScript 7 native compiler has no API that lint
  tools can use yet. The project only type-checks (`tsc --noEmit`), so nothing else depends on the version.

## Discrepancies with the assignment

1. **Hero Banner destination.** The assignment says the click should land on `/mattress`. On the real site the Hero Banner
   "Shop Mattress" link (`data-testid="hero_shop_mattress_btn"`) always points to
   `/mattresses/essential-latex-hybrid-mattress` (observed on 4 fresh page loads); only the comparison-table button points to `/mattress`.
   The test clicks the Hero Banner as required and asserts the observed path. To assert `/mattress` instead, change the one
   `toHaveURL` in `MattressPage.expectToBeOpen`, which then fails against the current site.
2. **API response path.** The assignment names `status.result.data`. The real body is
   `{ "status": "ok", "result": { "total_count": N, "data": [ ... ], "count_by_category": { ... } } }`.
   `status` is the string `"ok"`, a sibling of `result`, so the products collection is `result.data`. The tests check
   `status === "ok"` and `result.data`. Observed from a browser: 91 products for `brand=awara`, 1 for the name query.

## Known application defect (handled in the test)

On the product page, a size chosen while the page is still loading is silently reset to Queen, because the page keeps
re-pricing the cart and its last request resets the size. The cart then receives the wrong size. The UI shows no sign of this.
Locally the re-pricing takes about 2 s; on a slow runner the requests were spread over about 15 s with gaps of up to about 3.3 s.
`MattressPage.selectSize` therefore waits until the page's pricing requests (`/carts/quote`, `/api/products`, `/applicable-offers`)
have been quiet for 3.5 s, selects the size, waits for quiet again, and checks the size is still selected (choosing again if not).
`networkidle` was tried and is not reliable here, so it is not used.

## Verification status

**Developer machine** (macOS, Node 24, Playwright 1.65, Chromium):

- `npm run typecheck` and `npm run lint` pass.
- `npm run test:ui` passes: 14 of 14 with each of the 7 sizes run twice on 2 workers, as on CI.
- `npm run test:api` fails: both tests get HTTP 403 from Cloudflare.

**GitHub Actions** (`ubuntu-latest`): install, type check, lint and the artifact upload work, but `npm test` fails:

- Both API tests get HTTP 403 from Cloudflare.
- The UI tests fail after "Add to Cart", because the cart never opens. In the traces, most requests the page makes to
  `api.qa-env.residenthome.com` fail with `net::ERR_FAILED` (in one run 75 of 76, including the add-to-cart request in every test), while the
  site, its media and third-party scripts load fine. Chromium reports that the CORS preflight response has no `Access-Control-Allow-Origin` header.
  The share of rejected calls changes between runs, and in runs where more calls got through, UI tests passed on the runner too.
- Blocking `api.qa-env.residenthome.com` in the browser on a developer machine gives the same failure. The button depends on that API, so no
  change to the test can work around it.

**Cause (environment, not the test code):** the QA API is behind Cloudflare. It answers "you have been blocked" to Playwright's API client
from both a developer machine and a GitHub runner, also with User-Agent `E2EUI-Tests`, so the block does not depend on the User-Agent alone.
From a runner it also rejects most of the browser's calls, which carry the same User-Agent; from a developer machine it does not. Traces do not
record preflight responses, so Cloudflare is the likely but unconfirmed cause for the browser calls. The same API URLs return 200 JSON when
opened in a browser on a developer machine, which is how the response shape above was confirmed. No workaround (header spoofing, proxying or
mocking) is used, so CI stays red.

**What would fix it:** the owner of the QA environment lets the test traffic through, for example with a Cloudflare rule for the User-Agent
`E2EUI-Tests` that every test request already sends (the tests then need no change) or for a secret CI header. Allowing GitHub's IP ranges is
impractical, because they are large and change. The `cf-ray` id in a failed API test points the owner to the block in Cloudflare's event log.
The other option is to run the suite on a self-hosted runner or machine that is allowed.
