import Ajv, { type JSONSchemaType } from 'ajv';

export type Money = {
  amount: number;
  currency: string;
};

export type Pricing = {
  listPrice: Money;
  price: Money;
  description: string;
  label: string;
};

export type Availability = {
  isActive: boolean;
  isInStock: boolean;
  isBackOrderAllowed: boolean;
  backOrderMessage: string;
};

export type Addon = {
  id: string;
  addonType: string;
};

export type Media = {
  id: string;
  url: string;
  thumbUrl: string;
  contentType: string;
  tags: string[];
  created: number;
};

export type Product = {
  id: string;
  name: string;
  title: string;
  // The API sends this as the string "false", not a boolean.
  isService: string;
  type: string;
  extras: string[];
  addons: Addon[];
  description: string;
  brand: string;
  inventoryKey: string;
  categoryNameTree: string[];
  // Keyed by SKU, and empty on some products.
  availability: Record<string, Availability>;
  pricing: Pricing;
  mediaCollection: Media[];
};

/**
 * The fields of the GET /products body that are present on every product, taken from real responses.
 * Products also have optional fields (status, metadata, ...) that are not listed here.
 *
 * The assignment names the collection "status.result.data". The real response is
 * { status: "ok", result: { data: [...], total_count: N, ... } }, so the products
 * collection is at result.data and "status" is a sibling string, not a parent.
 */
export type ProductsBody = {
  status: string;
  result: {
    total_count: number;
    data: Product[];
    // For example { category: { Mattress: 11 }, sizes: {} }.
    count_by_category: Record<string, Record<string, number>>;
  };
};

const stringListSchema: JSONSchemaType<string[]> = {
  type: 'array',
  items: { type: 'string' },
};

const moneySchema: JSONSchemaType<Money> = {
  type: 'object',
  properties: {
    amount: { type: 'number' },
    currency: { type: 'string' },
  },
  required: ['amount', 'currency'],
};

const pricingSchema: JSONSchemaType<Pricing> = {
  type: 'object',
  properties: {
    listPrice: moneySchema,
    price: moneySchema,
    description: { type: 'string' },
    label: { type: 'string' },
  },
  required: ['listPrice', 'price', 'description', 'label'],
};

const availabilitySchema: JSONSchemaType<Availability> = {
  type: 'object',
  properties: {
    isActive: { type: 'boolean' },
    isInStock: { type: 'boolean' },
    isBackOrderAllowed: { type: 'boolean' },
    backOrderMessage: { type: 'string' },
  },
  required: ['isActive', 'isInStock', 'isBackOrderAllowed', 'backOrderMessage'],
};

const addonSchema: JSONSchemaType<Addon> = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    addonType: { type: 'string' },
  },
  required: ['id', 'addonType'],
};

const mediaSchema: JSONSchemaType<Media> = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    url: { type: 'string' },
    thumbUrl: { type: 'string' },
    contentType: { type: 'string' },
    tags: stringListSchema,
    created: { type: 'number' },
  },
  required: ['id', 'url', 'thumbUrl', 'contentType', 'tags', 'created'],
};

const productSchema: JSONSchemaType<Product> = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    title: { type: 'string' },
    isService: { type: 'string' },
    type: { type: 'string' },
    extras: stringListSchema,
    addons: { type: 'array', items: addonSchema },
    description: { type: 'string' },
    brand: { type: 'string' },
    inventoryKey: { type: 'string' },
    categoryNameTree: stringListSchema,
    availability: { type: 'object', required: [], additionalProperties: availabilitySchema },
    pricing: pricingSchema,
    mediaCollection: { type: 'array', items: mediaSchema },
  },
  required: [
    'id',
    'name',
    'title',
    'isService',
    'type',
    'extras',
    'addons',
    'description',
    'brand',
    'inventoryKey',
    'categoryNameTree',
    'availability',
    'pricing',
    'mediaCollection',
  ],
};

// JSONSchemaType makes the compiler reject a schema that drifts from ProductsBody.
// Extra properties are allowed, so the optional product fields do not fail validation.
const productsBodySchema: JSONSchemaType<ProductsBody> = {
  type: 'object',
  properties: {
    status: { type: 'string', const: 'ok' },
    result: {
      type: 'object',
      properties: {
        total_count: { type: 'number' },
        data: { type: 'array', items: productSchema },
        count_by_category: {
          type: 'object',
          required: [],
          additionalProperties: {
            type: 'object',
            required: [],
            additionalProperties: { type: 'number' },
          },
        },
      },
      required: ['total_count', 'data', 'count_by_category'],
    },
  },
  required: ['status', 'result'],
};

export const validateProductsBody = new Ajv({ allErrors: true }).compile(productsBodySchema);
