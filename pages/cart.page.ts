import { expect, type Locator, type Page } from '@playwright/test';

export class CartPage {
  /** Every line item in the cart (test ids look like cart_item_<Product_Name>). */
  private readonly items: Locator;

  constructor(private readonly page: Page) {
    this.items = page.getByTestId('cart_items_area').locator('[data-testid^="cart_item_"]');
  }

  async open() {
    await this.page.goto('/checkout/cart', { waitUntil: 'domcontentloaded' });
  }

  async expectToBeOpen() {
    await expect(this.page).toHaveURL(/\/checkout\/cart\/?(\?.*)?$/);
  }

  async expectOnlyItem({ name, size, quantity }: { name: string; size: string; quantity: number }) {
    await expect(this.items).toHaveCount(1);
    const item = this.item(name);
    await expect(item).toContainText(name);
    // Exact match, so "Twin" cannot pass for "Twin XL". The cart adds a shipping note to Split King only.
    const sizeLabel = size === 'Split King' ? 'Split King (Ships in 2 Twin XL boxes)' : size;
    await expect(item.getByTestId('checkout_Size')).toHaveText(`Size: ${sizeLabel}`);
    await expect(item.getByTestId('quantity_number')).toHaveText(String(quantity));
  }

  /** The cart line for one product. The site derives its test id from the product name. */
  private item(productName: string): Locator {
    return this.page.getByTestId(`cart_item_${productName.replace(/\s+/g, '_')}`);
  }
}
