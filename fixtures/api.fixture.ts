import { test as base } from '@playwright/test';
import { ProductsController } from '../controllers/products.controller';

type ApiFixtures = {
  productsController: ProductsController;
};

export const test = base.extend<ApiFixtures>({
  productsController: async ({ request }, use) => {
    await use(new ProductsController(request));
  },
});

export { expect } from '@playwright/test';
