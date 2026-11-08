import { expect, test } from '../../fixtures/api.fixture';

test.describe('Products API', () => {
  test('GET /products?brand=awara returns a non-empty product list', async ({ productsController }) => {
    const response = await productsController.getProductsByBrand('awara');
    expect(response.status(), productsController.describeResponse(response)).toBe(200);

    const body = await response.json();
    expect(productsController.getSchemaErrors(body)).toEqual([]);
    expect(body.result.data.length).toBeGreaterThan(0);
  });

  test('GET /products by name returns exactly the requested product', async ({ productsController }) => {
    const name = 'the-awara-hybrid-mattress-30';
    const response = await productsController.getProductByName({ name, lang: 'en', brand: 'awara' });
    expect(response.status(), productsController.describeResponse(response)).toBe(200);

    const body = await response.json();
    expect(productsController.getSchemaErrors(body)).toEqual([]);
    expect(body.result.data).toHaveLength(1);
    expect(body.result.data[0]).toMatchObject({ name });
  });
});
