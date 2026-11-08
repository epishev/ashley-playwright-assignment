import { expect, type Locator, type Page } from '@playwright/test';

export class HomePage {
  private readonly heading: Locator;
  private readonly heroShopMattressLink: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1 });
    // Scoped to the Hero Banner container. The page also has a "Shop Mattress"
    // link in the comparison table, and hidden responsive duplicates of the hero link.
    this.heroShopMattressLink = page
      .getByTestId('hero_content_container')
      .getByRole('link', { name: 'Shop Mattress' });
  }

  async open() {
    // 'domcontentloaded': the full load event waits for slow third-party content.
    const response = await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.status(), 'the homepage should respond with status 200').toBe(200);
  }

  async expectToBeOpen() {
    await expect(this.heading).toBeVisible();
    await expect(this.heroShopMattressLink).toBeVisible();
  }

  async clickHeroShopMattress() {
    await this.heroShopMattressLink.click();
  }
}
