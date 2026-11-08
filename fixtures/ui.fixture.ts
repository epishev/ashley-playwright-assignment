import { randomUUID } from 'node:crypto';
import { test as base } from '@playwright/test';
import { CartPage } from '../pages/cart.page';
import { HomePage } from '../pages/home.page';
import { MattressPage } from '../pages/mattress.page';

type UiFixtures = {
  homePage: HomePage;
  mattressPage: MattressPage;
  cartPage: CartPage;
  expectSiteToBeUp: () => Promise<void>;
};

/**
 * Cookies that stop the popups every fresh visitor gets. Without them, a cookie banner and a
 * promo modal arrive on timers (about 2 s and 7 s after load) and block clicks, and an upsell
 * dialog stops Add to Cart from saving the item until it is answered.
 *
 * - OptanonAlertBoxClosed: OneTrust treats the banner as closed. Only strictly necessary
 *   cookies stay active, the same as clicking "Close", so no cookie consent is given.
 * - _dyjsession + _dy_soct: Dynamic Yield treats the visit as an ongoing session and skips
 *   its first-visit campaigns, including the promo. The format is internal to that vendor.
 *   The campaign id does not matter, but _dy_soct must contain one.
 * - sopuUpgrade: the site remembers here the upsell offer it has shown, and on later page loads
 *   opens the dialog only for that same offer and size. A value naming no offer keeps it closed,
 *   so Add to Cart saves the item straight away. The format is internal to the site.
 */
function cookiesThatStopPopups(baseURL: string) {
  const session = randomUUID().replaceAll('-', '');
  const cookie = (name: string, value: string) => ({
    name,
    value,
    domain: new URL(baseURL).hostname,
    path: '/',
    expires: -1,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as const,
  });

  return [
    cookie('OptanonAlertBoxClosed', new Date().toISOString()),
    cookie('_dyjsession', session),
    cookie('_dy_soct', `${Math.floor(Date.now() / 1000)}!3742329.-6!${session}`),
    cookie('sopuUpgrade', encodeURIComponent(JSON.stringify({ offerName: 'none', size: 'none' }))),
  ];
}

// Playwright creates the fixtures a test or hook asks for before its body runs, so
// a beforeEach that navigates must ask for mattressPage for it to see every pricing request.
export const test = base.extend<UiFixtures>({
  storageState: async ({ baseURL }, use) => {
    await use({ cookies: cookiesThatStopPopups(baseURL!), origins: [] });
  },
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  mattressPage: async ({ page }, use) => {
    await use(new MattressPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  // Uses its own short-lived page, because beforeAll cannot use the per-test page fixture.
  expectSiteToBeUp: async ({ browser }, use) => {
    await use(async () => {
      const page = await browser.newPage();
      await new HomePage(page).open();
      await page.close();
    });
  },
});
