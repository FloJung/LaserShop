import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { updateCashflow } from "@/lib/server/cashflow";
import { getStoredShopifyAccessToken } from "@/lib/server/shopify-auth";

const SHOPIFY_SHOP_DOMAIN = "laser-991863.myshopify.com";
const SHOPIFY_API_VERSION = "2026-01";
const SHOPIFY_PRODUCTS_URL = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products.json`;
const SHOPIFY_PRODUCT_MAPPING_COLLECTION = "shopifyProductMappings";
const SHOPIFY_ORDER_COLLECTION = "shopifyOrders";

type LocalProductSyncInput = {
  localProductId: string;
  localVariantId?: string;
  title: string;
  description: string;
  price: number;
  sku?: string;
  status?: "draft" | "active" | "archived";
};

type ShopifyProductRecord = {
  id?: number;
  admin_graphql_api_id?: string;
  variants?: Array<{
    id?: number;
    sku?: string;
  }>;
};

type ShopifyProductResponse = {
  product?: ShopifyProductRecord;
  error?: string;
  errors?: unknown;
};

type ShopifyProductMappingDocument = {
  localProductId: string;
  localVariantId?: string;
  shopifyProductId: string;
  shopifyVariantId?: string;
  shopifyAdminGraphqlApiId?: string;
  createdAt: string;
  updatedAt: string;
};

type ShopifyIncomingLineItem = {
  id?: number | string;
  product_id?: number | string;
  variant_id?: number | string;
  sku?: string;
  title?: string;
  quantity?: number;
  price?: number | string;
};

type ShopifyIncomingOrder = {
  id?: number | string;
  name?: string;
  email?: string;
  currency?: string;
  total_price?: number | string;
  financial_status?: string;
  fulfillment_status?: string | null;
  created_at?: string;
  updated_at?: string;
  customer?: {
    id?: number | string;
    email?: string;
    first_name?: string;
    last_name?: string;
  } | null;
  line_items?: ShopifyIncomingLineItem[];
};

function nowIso() {
  return new Date().toISOString();
}

function getShopifyClientSecret() {
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error("SHOPIFY_CLIENT_SECRET is not configured.");
  }

  return clientSecret;
}

function getShopifyAccessToken() {
  const accessToken = getStoredShopifyAccessToken() ?? process.env.SHOPIFY_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("No Shopify access token is available in memory or SHOPIFY_ACCESS_TOKEN.");
  }

  return accessToken;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error.";
}

async function parseJsonResponse<T>(response: Response) {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function extractShopifyError(payload: ShopifyProductResponse | Record<string, unknown> | null) {
  if (!payload) {
    return "Empty response from Shopify.";
  }

  if (typeof payload.error === "string" && payload.error.length > 0) {
    return payload.error;
  }

  if ("errors" in payload && payload.errors) {
    return typeof payload.errors === "string" ? payload.errors : JSON.stringify(payload.errors);
  }

  return "Unknown Shopify error.";
}

function mapLocalProductToShopifyPayload(productData: LocalProductSyncInput) {
  return {
    product: {
      title: productData.title,
      body_html: productData.description,
      ...(productData.status ? { status: productData.status } : {}),
      variants: [
        {
          price: productData.price.toFixed(2),
          ...(productData.sku ? { sku: productData.sku } : {})
        }
      ]
    }
  };
}

async function saveShopifyProductMapping(input: {
  localProductId: string;
  localVariantId?: string;
  shopifyProduct: ShopifyProductRecord;
}) {
  if (!isFirebaseAdminConfigured() || !input.shopifyProduct.id) {
    return;
  }

  const timestamp = nowIso();
  const mappingRef = getAdminDb().collection(SHOPIFY_PRODUCT_MAPPING_COLLECTION).doc(input.localProductId);
  const existing = await mappingRef.get();
  const primaryVariant = input.shopifyProduct.variants?.[0];
  const mapping: ShopifyProductMappingDocument = {
    localProductId: input.localProductId,
    ...(input.localVariantId ? { localVariantId: input.localVariantId } : {}),
    shopifyProductId: String(input.shopifyProduct.id),
    ...(primaryVariant?.id ? { shopifyVariantId: String(primaryVariant.id) } : {}),
    ...(input.shopifyProduct.admin_graphql_api_id
      ? { shopifyAdminGraphqlApiId: input.shopifyProduct.admin_graphql_api_id }
      : {}),
    createdAt: existing.exists ? ((existing.data() as ShopifyProductMappingDocument).createdAt ?? timestamp) : timestamp,
    updatedAt: timestamp
  };

  await mappingRef.set(mapping, { merge: true });
}

async function getShopifyProductMapping(localProductId: string) {
  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  const snapshot = await getAdminDb().collection(SHOPIFY_PRODUCT_MAPPING_COLLECTION).doc(localProductId).get();
  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data() as ShopifyProductMappingDocument;
}

async function updateShopifyProduct(productData: LocalProductSyncInput & { shopifyProductId: string }) {
  const response = await fetch(
    `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${productData.shopifyProductId}.json`,
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": getShopifyAccessToken()
      },
      body: JSON.stringify({
        product: {
          id: Number(productData.shopifyProductId),
          ...mapLocalProductToShopifyPayload(productData).product
        }
      }),
      cache: "no-store"
    }
  );

  const payload = await parseJsonResponse<ShopifyProductResponse>(response);
  if (!response.ok || !payload?.product?.id) {
    throw new Error(`Shopify product update failed (${response.status}): ${extractShopifyError(payload)}`);
  }

  await saveShopifyProductMapping({
    localProductId: productData.localProductId,
    localVariantId: productData.localVariantId,
    shopifyProduct: payload.product
  });

  console.log("[shopify] product updated:", {
    localProductId: productData.localProductId,
    shopifyProductId: payload.product.id
  });

  return payload.product;
}

export async function createShopifyProduct(productData: LocalProductSyncInput) {
  const response = await fetch(SHOPIFY_PRODUCTS_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": getShopifyAccessToken()
    },
    body: JSON.stringify(mapLocalProductToShopifyPayload(productData)),
    cache: "no-store"
  });

  const payload = await parseJsonResponse<ShopifyProductResponse>(response);
  if (!response.ok || !payload?.product?.id) {
    throw new Error(`Shopify product creation failed (${response.status}): ${extractShopifyError(payload)}`);
  }

  await saveShopifyProductMapping({
    localProductId: productData.localProductId,
    localVariantId: productData.localVariantId,
    shopifyProduct: payload.product
  });

  console.log("[shopify] product created:", {
    localProductId: productData.localProductId,
    shopifyProductId: payload.product.id
  });

  return payload.product;
}

export async function syncProductToShopify(productData: LocalProductSyncInput) {
  const mapping = await getShopifyProductMapping(productData.localProductId);
  if (mapping?.shopifyProductId) {
    return updateShopifyProduct({
      ...productData,
      shopifyProductId: mapping.shopifyProductId
    });
  }

  return createShopifyProduct(productData);
}

export function generateShopifyWebhookHmac(rawBody: string) {
  return createHmac("sha256", getShopifyClientSecret()).update(rawBody, "utf8").digest("base64");
}

async function fetchShopifyProduct(productId: string) {
  const response = await fetch(`https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}.json`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Shopify-Access-Token": getShopifyAccessToken()
    },
    cache: "no-store"
  });

  const payload = await parseJsonResponse<ShopifyProductResponse>(response);
  if (!response.ok || !payload?.product?.id) {
    throw new Error(`Shopify product fetch failed (${response.status}): ${extractShopifyError(payload)}`);
  }

  return payload.product;
}

async function resolveShopifyVariantId(localProductId: string, localVariantId: string) {
  const mapping = await getShopifyProductMapping(localProductId);
  if (!mapping?.shopifyProductId) {
    throw new Error(`No Shopify product mapping found for local product ${localProductId}.`);
  }

  if (mapping.shopifyVariantId && (!mapping.localVariantId || mapping.localVariantId === localVariantId)) {
    return mapping.shopifyVariantId;
  }

  const product = await fetchShopifyProduct(mapping.shopifyProductId);
  await saveShopifyProductMapping({
    localProductId,
    localVariantId,
    shopifyProduct: product
  });

  const refreshedVariantId = product.variants?.[0]?.id;
  if (!refreshedVariantId) {
    throw new Error(`No Shopify variant found for local product ${localProductId}.`);
  }

  return String(refreshedVariantId);
}

export async function createCheckoutSession(productId: string, variantId: string, quantity: number) {
  const safeQuantity = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
  const shopifyVariantId = await resolveShopifyVariantId(productId, variantId);
  return `https://${SHOPIFY_SHOP_DOMAIN}/cart/${shopifyVariantId}:${safeQuantity}`;
}

export async function createCartCheckoutSession(
  lines: Array<{ productId: string; variantId: string; quantity: number }>
) {
  if (lines.length === 0) {
    throw new Error("Cannot create Shopify checkout for an empty cart.");
  }

  const resolvedLines = await Promise.all(
    lines.map(async (line) => {
      const quantity = Number.isInteger(line.quantity) && line.quantity > 0 ? line.quantity : 1;
      const shopifyVariantId = await resolveShopifyVariantId(line.productId, line.variantId);

      return `${shopifyVariantId}:${quantity}`;
    })
  );

  return `https://${SHOPIFY_SHOP_DOMAIN}/cart/${resolvedLines.join(",")}`;
}

export function verifyShopifyWebhookHmac(rawBody: string, providedHmac: string | null) {
  if (!providedHmac) {
    return false;
  }

  const digest = generateShopifyWebhookHmac(rawBody);
  const digestBuffer = Buffer.from(digest);
  const providedBuffer = Buffer.from(providedHmac);

  if (digestBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(digestBuffer, providedBuffer);
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

export async function handleIncomingOrder(orderData: ShopifyIncomingOrder) {
  if (!isFirebaseAdminConfigured()) {
    throw new Error("Firebase admin is not configured.");
  }

  const orderId = normalizeString(orderData.id) ?? String(normalizeNumber(orderData.id) ?? "");
  if (!orderId) {
    throw new Error("Incoming Shopify order is missing an id.");
  }

  const timestamp = nowIso();
  const lineItems = Array.isArray(orderData.line_items)
    ? orderData.line_items.map((item) => ({
        id: normalizeString(item.id) ?? String(normalizeNumber(item.id) ?? ""),
        productId: normalizeString(item.product_id) ?? String(normalizeNumber(item.product_id) ?? ""),
        variantId: normalizeString(item.variant_id) ?? String(normalizeNumber(item.variant_id) ?? ""),
        sku: normalizeString(item.sku),
        title: normalizeString(item.title),
        quantity: normalizeNumber(item.quantity) ?? 0,
        price: normalizeNumber(item.price) ?? 0
      }))
    : [];

  console.log("[shopify] incoming order received:", {
    orderId,
    totalPrice: normalizeNumber(orderData.total_price) ?? 0,
    lineItemCount: lineItems.length
  });

  const customer = orderData.customer
    ? {
        id: normalizeString(orderData.customer.id) ?? String(normalizeNumber(orderData.customer.id) ?? ""),
        email: normalizeString(orderData.customer.email) ?? normalizeString(orderData.email),
        firstName: normalizeString(orderData.customer.first_name),
        lastName: normalizeString(orderData.customer.last_name)
      }
    : {
        email: normalizeString(orderData.email)
      };

  await getAdminDb()
    .collection(SHOPIFY_ORDER_COLLECTION)
    .doc(orderId)
    .set(
      {
        source: "shopify",
        shopifyOrderId: orderId,
        orderName: normalizeString(orderData.name),
        email: normalizeString(orderData.email),
        currency: normalizeString(orderData.currency),
        totalPrice: normalizeNumber(orderData.total_price) ?? 0,
        financialStatus: normalizeString(orderData.financial_status),
        fulfillmentStatus: normalizeString(orderData.fulfillment_status),
        lineItems,
        customer,
        shopifyCreatedAt: normalizeString(orderData.created_at),
        shopifyUpdatedAt: normalizeString(orderData.updated_at),
        receivedAt: timestamp,
        updatedAt: timestamp
      },
      { merge: true }
    );

  const cashflowResult = await updateCashflow({
    orderId,
    total: normalizeNumber(orderData.total_price) ?? 0,
    currency: normalizeString(orderData.currency) ?? "EUR",
    items: lineItems.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      sku: item.sku,
      title: item.title,
      quantity: item.quantity,
      price: item.price
    })),
    customer,
    createdAt: normalizeString(orderData.created_at) ?? timestamp
  });

  console.log("[shopify] cashflow updated:", cashflowResult);

  return {
    orderId,
    totalPrice: normalizeNumber(orderData.total_price) ?? 0,
    lineItemCount: lineItems.length
  };
}

export { getErrorMessage as getShopifyIntegrationErrorMessage };
