import { test } from '../../fixtures/ui.fixture';

// The site opens the cart by itself after adding these sizes. Split King has its own test below.
const sizes = ['Twin', 'Twin XL', 'Full', 'Queen', 'King', 'Cal King'];

test.describe('Adding a mattress to the cart', () => {
  test.beforeEach(async ({ homePage, mattressPage }) => {
    await test.step('Open the homepage', async () => {
      await homePage.open();
      await homePage.expectToBeOpen();
    });

    await test.step('Click "Shop Mattress" on the Hero Banner', async () => {
      await homePage.clickHeroShopMattress();
      await mattressPage.expectToBeOpen();
    });
  });

  for (const size of sizes) {
    test(`visitor adds a ${size} mattress from the Hero Banner to the cart`, async ({ mattressPage, cartPage }) => {
      const mattressName = await mattressPage.getProductName();

      await test.step(`Choose size ${size} and add the mattress to the cart`, async () => {
        await mattressPage.selectSize(size);
        await mattressPage.addToCart();
      });

      await test.step('Check that the cart contains only the chosen mattress', async () => {
        await cartPage.expectToBeOpen();
        await cartPage.expectOnlyItem({ name: mattressName, size, quantity: 1 });
      });
    });
  }

  // The site stays on the product page behind a "Please Note" shipping notice, so the test opens the cart itself.
  test('visitor adds a Split King mattress from the Hero Banner to the cart', async ({ mattressPage, cartPage }) => {
    const mattressName = await mattressPage.getProductName();

    await test.step('Choose size Split King and add the mattress to the cart', async () => {
      await mattressPage.selectSize('Split King');
      await mattressPage.addToCart();
      await mattressPage.expectCartCount(1);
    });

    await test.step('Open the cart and check that it contains only the chosen mattress', async () => {
      await cartPage.open();
      await cartPage.expectOnlyItem({ name: mattressName, size: 'Split King', quantity: 1 });
    });
  });
});
