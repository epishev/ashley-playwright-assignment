import { expect, type Locator, type Page } from '@playwright/test';

// Requests the product page uses to price the cart (observed on /mattresses/*).
const PRICING_REQUEST = /\/carts\/quote|\/api\/products|\/applicable-offers/;
// Pricing requests are chained with gaps of ~250 ms locally but up to ~3.3 s on a
// slow CI runner, so "settled" means none in flight for longer than that.
const QUIET_MS = 3_500;

export class MattressPage {
  private readonly title: Locator;
  private readonly sizeSelect: Locator;
  private readonly addToCartButton: Locator;
  private readonly cartCounter: Locator;

  private inFlight = 0;
  private lastPricingActivity = Date.now();
  private selectedSizeText = '';

  constructor(private readonly page: Page) {
    this.title = page.getByTestId('product_title');
    this.sizeSelect = page.getByTestId('add_to_cart_property_selector_size');
    this.addToCartButton = page.getByRole('button', { name: 'Add to Cart', exact: true });
    // The header also has a hidden responsive duplicate of the counter.
    this.cartCounter = page.getByTestId('cart_counter').filter({ visible: true });

    // This page object must exist before the test navigates, or requests are missed.
    // The fixture guarantees that when the test asks for mattressPage.
    const onStart = (url: string) => {
      if (!PRICING_REQUEST.test(url)) return;
      this.inFlight++;
      this.lastPricingActivity = Date.now();
    };
    const onEnd = (url: string) => {
      if (!PRICING_REQUEST.test(url)) return;
      this.inFlight--;
      this.lastPricingActivity = Date.now();
    };
    page.on('request', (request) => onStart(request.url()));
    page.on('requestfinished', (request) => onEnd(request.url()));
    page.on('requestfailed', (request) => onEnd(request.url()));
  }

  async expectToBeOpen() {
    // The assignment expects /mattress, but the Hero Banner link points to this
    // product page (see README, "Discrepancies with the assignment").
    await expect(this.page).toHaveURL(/\/mattresses\/essential-latex-hybrid-mattress\/?(\?.*)?$/);
    await expect(this.title).toBeVisible();
    await expect(this.addToCartButton).toBeVisible();
  }

  async getProductName() {
    const name = (await this.title.innerText()).trim();
    expect(name, 'the product should have a name').not.toBe('');
    return name;
  }

  /**
   * Waits for the page's pricing requests to go quiet, chooses the size once, and checks that it survives.
   *
   * Application defect (README, "Known application defect"): while the page loads it keeps re-pricing the
   * cart, and its last request resets the size to the default (Queen) without any sign in the UI. The page
   * exposes no readiness signal (no disabled control, no single "ready" response; in a probe, even waiting for
   * the first quote and both offers responses still lost the choice in about 1 run of 12), so the wait for
   * quiet pricing is a heuristic that lowers the odds of hitting the defect. It is not a guarantee. The size
   * is never chosen again: if the app resets it, expectSizeToPersist fails and reports the defect.
   */
  async selectSize(size: string) {
    await this.waitForPricingToSettle();
    await this.chooseSize(size);
    await this.expectSizeToPersist();
  }

  /** Chooses the size right now, without waiting for the page to finish loading. */
  async chooseSize(size: string) {
    await this.sizeSelect.click();
    // Option names look like "Twin XL(Total Value $1,041)$749". Match up to the bracket
    // or price, because a plain prefix match would make "Twin" also match "Twin XL".
    const option = this.page.getByRole('option', { name: new RegExp(`^${size}\\s*[($]`) });
    this.selectedSizeText = ((await option.textContent()) ?? '').trim();
    await option.click();
    // The label changes first; the price follows once the size is applied.
    await expect(this.sizeSelect).toHaveText(this.selectedSizeText);
  }

  /** Our own change triggers re-pricing; waits for it to go quiet, then the chosen size must still be selected. */
  async expectSizeToPersist() {
    await this.waitForPricingToSettle();
    await expect(
      this.sizeSelect,
      `the page reset the size after it was chosen (known application defect); expected "${this.selectedSizeText}"`,
    ).toHaveText(this.selectedSizeText);
  }

  private async waitForPricingToSettle() {
    await expect
      .poll(() => this.inFlight === 0 && Date.now() - this.lastPricingActivity >= QUIET_MS, {
        message: 'product page should finish its pricing requests',
        timeout: 30_000,
      })
      .toBe(true);
  }

  /** The upsell dialog is turned off by a cookie (fixtures/ui.fixture.ts), so this click alone saves the item. */
  async addToCart() {
    await expect(this.sizeSelect).toHaveText(this.selectedSizeText);
    await this.addToCartButton.click();
  }

  /** The header counter updates only after the site has saved the item. */
  async expectCartCount(count: number) {
    await expect(this.cartCounter).toHaveText(String(count));
  }
}
