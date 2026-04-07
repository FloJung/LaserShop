import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminBucket, getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { normalizeLegacyProductImage } from "@/lib/server/product-image-normalization";
import { updateCashflow } from "@/lib/server/cashflow";
import { getStoredShopifyAccessToken } from "@/lib/server/shopify-auth";
import type {
  CartConfigurationInput,
  CustomerAddress,
  OrderDocument,
  OrderItemConfigurationDocument,
  OrderItemDocument,
  ValidatedShopifyCheckoutPayload
} from "@/shared/catalog";
import {
  productDocumentSchema,
  productOptionDocumentSchema,
  productOptionValueDocumentSchema,
  productVariantDocumentSchema,
  validateShopifyCheckoutPayload
} from "@/shared/catalog";

const SHOPIFY_SHOP_DOMAIN = "laser-991863.myshopify.com";
const SHOPIFY_API_VERSION = "2026-01";
const SHOPIFY_PRODUCTS_URL = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products.json`;
const SHOPIFY_PRODUCT_MAPPING_COLLECTION = "shopifyProductMappings";
const SHOPIFY_CHECKOUT_CONTEXT_COLLECTION = "shopifyCheckoutContexts";
const SHOPIFY_ORDER_COLLECTION = "shopifyOrders";
const SHOPIFY_CHECKOUT_CONTEXT_ATTRIBUTE = "ls_checkout_context";
const SHOPIFY_CHECKOUT_SOURCE_ATTRIBUTE = "ls_checkout_source";
const SHOPIFY_CHECKOUT_NOTE_PREFIX = "LaserShop checkout context:";
const MAX_INLINE_PREVIEW_IMAGE_LENGTH = 700_000;

type LocalProductSyncInput = {
  localProductId: string;
  localVariantId?: string;
  title: string;
  description: string;
  price: number;
  sku?: string;
  status?: "draft" | "active" | "archived";
};

type LocalProductImageSyncInput = {
  id: string;
  productId: string;
  storagePath: string;
  publicUrl: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
  shopifyImageId?: string;
};

type ShopifyImageRecord = {
  id?: number;
  src?: string;
  alt?: string;
  position?: number;
};

type ShopifyProductImagesResponse = {
  image?: ShopifyImageRecord;
  images?: ShopifyImageRecord[];
  error?: string;
  errors?: unknown;
};

type ShopifyProductImageSyncSummary = {
  success: boolean;
  syncedCount: number;
  createdCount: number;
  updatedCount: number;
  deletedCount: number;
  failedCount: number;
  failedImageIds: string[];
  errors: Array<{
    imageId: string;
    message: string;
  }>;
};

export type ShopifyAccessTokenSource = "env" | "memory";

export type ShopifyProductSyncResult =
  | {
      success: true;
      action: "create" | "update";
      localProductId: string;
      localVariantId?: string;
      responseStatus: number;
      shopifyProductId: string;
      shopifyVariantId?: string;
      mappingWritten: boolean;
      mappingPath?: string;
      tokenSource: ShopifyAccessTokenSource;
      imageSync?: ShopifyProductImageSyncSummary;
    }
  | {
      success: false;
      action: "create" | "update";
      localProductId: string;
      localVariantId?: string;
      responseStatus?: number;
      error: string;
      shopifyError?: string;
      mappingWritten: false;
      tokenSource?: ShopifyAccessTokenSource;
      imageSync?: ShopifyProductImageSyncSummary;
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

class ShopifyApiRequestError extends Error {
  readonly responseStatus: number;
  readonly shopifyError: string;

  constructor(message: string, responseStatus: number, shopifyError: string) {
    super(message);
    this.name = "ShopifyApiRequestError";
    this.responseStatus = responseStatus;
    this.shopifyError = shopifyError;
  }
}

type ShopifyIncomingLineItem = {
  id?: number | string;
  product_id?: number | string;
  variant_id?: number | string;
  sku?: string;
  title?: string;
  quantity?: number;
  price?: number | string;
};

type ShopifyNoteAttribute = {
  name?: string;
  key?: string;
  value?: string;
};

type ShopifyIncomingOrder = {
  id?: number | string;
  name?: string;
  email?: string;
  note?: string;
  note_attributes?: ShopifyNoteAttribute[];
  currency?: string;
  subtotal_price?: number | string;
  current_subtotal_price?: number | string;
  total_price?: number | string;
  total_tax?: number | string;
  current_total_tax?: number | string;
  total_discounts?: number | string;
  current_total_discounts?: number | string;
  financial_status?: string;
  fulfillment_status?: string | null;
  cancelled_at?: string | null;
  created_at?: string;
  updated_at?: string;
  customer?: {
    id?: number | string;
    email?: string;
    first_name?: string;
    last_name?: string;
  } | null;
  shipping_address?: {
    first_name?: string;
    last_name?: string;
    company?: string;
    address1?: string;
    address2?: string;
    zip?: string;
    city?: string;
    country_code?: string;
    phone?: string;
  } | null;
  billing_address?: {
    first_name?: string;
    last_name?: string;
    company?: string;
    address1?: string;
    address2?: string;
    zip?: string;
    city?: string;
    country_code?: string;
    phone?: string;
  } | null;
  shipping_lines?: Array<{
    price?: number | string;
  }>;
  line_items?: ShopifyIncomingLineItem[];
};

type CheckoutContextLineInput = {
  lineId?: string;
  lineType?: "product" | "custom-design";
  productId: string;
  variantId: string;
  quantity: number;
  previewImage?: string;
  configurations?: unknown;
};

type ResolvedCheckoutContextLine = {
  lineId: string;
  lineType: "product" | "custom-design";
  productId: string;
  variantId: string;
  quantity: number;
  shopifyProductId: string;
  shopifyVariantId: string;
  name?: string;
  price?: number;
  image?: string;
  subtitle?: string;
  previewImage?: string;
  previewImageStorage: "missing" | "inline" | "omitted_too_large";
  configurations?: CartConfigurationInput[];
  customData?: Record<string, unknown>;
};

type ShopifyCheckoutContextDocument = {
  source: "buy_now" | "cart";
  status: "pending" | "matched";
  lineCount: number;
  totalQuantity: number;
  lineTypes: Array<"product" | "custom-design">;
  hasConfigurations: boolean;
  hasCustomDesigns: boolean;
  shopifyLineSignature: string;
  shopifyNote: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  matchedOrderId?: string;
  matchedOrderName?: string;
  matchedAt?: string;
};

type ShopifyCheckoutContextLineDocument = {
  lineType: "product" | "custom-design";
  productId: string;
  variantId: string;
  quantity: number;
  shopifyProductId: string;
  shopifyVariantId: string;
  name?: string;
  price?: number;
  image?: string;
  subtitle?: string;
  previewImage?: string;
  previewImageStorage: "missing" | "inline" | "omitted_too_large";
  configurations?: CartConfigurationInput[];
  customData?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type ShopifyCheckoutContextWithLines = ShopifyCheckoutContextDocument & {
  id: string;
  lines: Array<
    ShopifyCheckoutContextLineDocument & {
      id: string;
    }
  >;
};

type OrderMirrorProductContext = {
  productId: string;
  productTitle: string;
  variantId: string;
  variantName: string;
  sku: string;
  unitPriceCents: number;
  productionTimeDays: number;
  options: Array<{
    id: string;
    doc: ReturnType<typeof productOptionDocumentSchema.parse>;
    values: Array<{ id: string; doc: ReturnType<typeof productOptionValueDocumentSchema.parse> }>;
  }>;
};

type OrderMirrorResult =
  | {
      status: "mirrored" | "already_mirrored";
      canonicalOrderId: string;
      canonicalOrderNumber: string;
    }
  | {
      status: "skipped";
      reason: string;
    }
  | {
      status: "failed";
      reason: string;
    };

function nowIso() {
  return new Date().toISOString();
}

function plusHoursIso(baseIso: string, hours: number) {
  const base = new Date(baseIso);
  return new Date(base.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function plusDaysIso(baseIso: string, days: number) {
  const base = new Date(baseIso);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString();
}

function getShopifyClientSecret() {
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error("SHOPIFY_CLIENT_SECRET is not configured.");
  }

  return clientSecret;
}

function normalizeShopifyAccessToken(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "DEIN_VOLLSTAENDIGER_TOKEN") {
    return null;
  }

  return trimmed;
}

function getShopifyAccessTokenSource() {
  if (normalizeShopifyAccessToken(process.env.SHOPIFY_ACCESS_TOKEN)) {
    return "env" as const;
  }

  if (normalizeShopifyAccessToken(getStoredShopifyAccessToken())) {
    return "memory" as const;
  }

  return null;
}

function getShopifyAccessToken() {
  const accessToken =
    normalizeShopifyAccessToken(process.env.SHOPIFY_ACCESS_TOKEN) ??
    normalizeShopifyAccessToken(getStoredShopifyAccessToken());
  if (!accessToken) {
    throw new Error(
      "No Shopify access token is available. Set SHOPIFY_ACCESS_TOKEN on the server or complete Shopify OAuth in the current process."
    );
  }

  return accessToken;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error.";
}

function hasShopifyAccessToken() {
  return getShopifyAccessTokenSource() !== null;
}

function logShopifyProductSync(event: string, details: Record<string, unknown>) {
  console.log(`[shopify] product sync ${event}:`, details);
}

function normalizeCheckoutQuantity(value: number) {
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function normalizeUploadReference(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const uploadId = "uploadId" in value && typeof value.uploadId === "string" ? value.uploadId.trim() : "";
  if (!uploadId) {
    return undefined;
  }

  const originalFilename =
    "originalFilename" in value && typeof value.originalFilename === "string" && value.originalFilename.trim().length > 0
      ? value.originalFilename.trim()
      : undefined;

  return {
    uploadId,
    ...(originalFilename ? { originalFilename } : {})
  } satisfies CartConfigurationInput["value"];
}

function normalizeCartConfigurations(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const configurations = value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }

    const optionId = "optionId" in entry && typeof entry.optionId === "string" ? entry.optionId.trim() : "";
    if (!optionId) {
      return [];
    }

    const rawValue = "value" in entry ? entry.value : undefined;
    const normalizedValue =
      typeof rawValue === "string"
        ? rawValue
        : typeof rawValue === "boolean"
          ? rawValue
          : normalizeUploadReference(rawValue);

    if (typeof normalizedValue === "undefined") {
      return [];
    }

    return [
      {
        optionId,
        value: normalizedValue
      } satisfies CartConfigurationInput
    ];
  });

  return configurations.length > 0 ? configurations : undefined;
}

function normalizeDesignJson(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function summarizeDesignJson(designJson?: Record<string, unknown>) {
  if (!designJson) {
    return undefined;
  }

  const version = typeof designJson.version === "number" ? designJson.version : undefined;
  const productId = typeof designJson.productId === "string" ? designJson.productId : undefined;
  const updatedAt = typeof designJson.updatedAt === "string" ? designJson.updatedAt : undefined;
  const elements = Array.isArray(designJson.elements) ? designJson.elements : [];
  const elementTypes = elements
    .flatMap((element) => {
      if (!element || typeof element !== "object" || Array.isArray(element)) {
        return [];
      }

      return "type" in element && typeof element.type === "string" ? [element.type] : [];
    })
    .slice(0, 50);

  const summary = {
    ...(typeof version === "number" ? { designVersion: version } : {}),
    ...(productId ? { designProductId: productId } : {}),
    ...(updatedAt ? { designUpdatedAt: updatedAt } : {}),
    ...(elements.length > 0 ? { elementCount: elements.length, elementTypes } : {}),
    ...(elements.some((element) => element && typeof element === "object" && !Array.isArray(element) && "type" in element && element.type === "upload")
      ? { hasUploads: true }
      : {})
  } satisfies Record<string, unknown>;

  return Object.keys(summary).length > 0 ? summary : undefined;
}

function normalizePreviewImageForStorage(value: string | undefined) {
  if (!value || value.trim().length === 0) {
    return {
      previewImage: undefined,
      previewImageStorage: "missing" as const
    };
  }

  if (value.length > MAX_INLINE_PREVIEW_IMAGE_LENGTH) {
    return {
      previewImage: undefined,
      previewImageStorage: "omitted_too_large" as const
    };
  }

  return {
    previewImage: value,
    previewImageStorage: "inline" as const
  };
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
    console.warn("[shopify] product mapping skipped:", {
      localProductId: input.localProductId,
      localVariantId: input.localVariantId ?? null,
      hasFirebaseAdmin: isFirebaseAdminConfigured(),
      hasShopifyProductId: Boolean(input.shopifyProduct.id)
    });
    return null;
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
  logShopifyProductSync("mapping saved", {
    localProductId: input.localProductId,
    localVariantId: input.localVariantId ?? null,
    shopifyProductId: mapping.shopifyProductId,
    shopifyVariantId: mapping.shopifyVariantId ?? null,
    mappingPath: `${SHOPIFY_PRODUCT_MAPPING_COLLECTION}/${input.localProductId}`,
    mappingWritten: true
  });

  return mapping;
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

export async function getShopifyProductMappingSummary(localProductId: string) {
  const mapping = await getShopifyProductMapping(localProductId);
  if (!mapping) {
    return null;
  }

  return {
    localProductId: mapping.localProductId,
    ...(mapping.localVariantId ? { localVariantId: mapping.localVariantId } : {}),
    shopifyProductId: mapping.shopifyProductId,
    ...(mapping.shopifyVariantId ? { shopifyVariantId: mapping.shopifyVariantId } : {}),
    ...(mapping.shopifyAdminGraphqlApiId ? { shopifyAdminGraphqlApiId: mapping.shopifyAdminGraphqlApiId } : {}),
    createdAt: mapping.createdAt,
    updatedAt: mapping.updatedAt,
    mappingPath: `${SHOPIFY_PRODUCT_MAPPING_COLLECTION}/${localProductId}`
  };
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
    const shopifyError = extractShopifyError(payload);
    console.error("[shopify] product update failed:", {
      localProductId: productData.localProductId,
      localVariantId: productData.localVariantId ?? null,
      shopifyProductId: productData.shopifyProductId,
      responseStatus: response.status,
      shopifyError
    });
    throw new ShopifyApiRequestError(
      `Shopify product update failed (${response.status}): ${shopifyError}`,
      response.status,
      shopifyError
    );
  }

  const mapping = await saveShopifyProductMapping({
    localProductId: productData.localProductId,
    localVariantId: productData.localVariantId,
    shopifyProduct: payload.product
  });

  logShopifyProductSync("update response", {
    localProductId: productData.localProductId,
    localVariantId: productData.localVariantId ?? null,
    responseStatus: response.status,
    shopifyProductId: payload.product.id,
    shopifyVariantId: payload.product.variants?.[0]?.id ?? null
  });

  return {
    product: payload.product,
    responseStatus: response.status,
    mapping
  };
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
    const shopifyError = extractShopifyError(payload);
    console.error("[shopify] product creation failed:", {
      localProductId: productData.localProductId,
      localVariantId: productData.localVariantId ?? null,
      responseStatus: response.status,
      shopifyError
    });
    throw new ShopifyApiRequestError(
      `Shopify product creation failed (${response.status}): ${shopifyError}`,
      response.status,
      shopifyError
    );
  }

  const mapping = await saveShopifyProductMapping({
    localProductId: productData.localProductId,
    localVariantId: productData.localVariantId,
    shopifyProduct: payload.product
  });

  logShopifyProductSync("create response", {
    localProductId: productData.localProductId,
    localVariantId: productData.localVariantId ?? null,
    responseStatus: response.status,
    shopifyProductId: payload.product.id,
    shopifyVariantId: payload.product.variants?.[0]?.id ?? null
  });

  return {
    product: payload.product,
    responseStatus: response.status,
    mapping
  };
}

async function syncProductToShopifyOrThrow(productData: LocalProductSyncInput) {
  const mapping = await getShopifyProductMapping(productData.localProductId);
  const action: "create" | "update" = mapping?.shopifyProductId ? "update" : "create";
  const tokenSource = getShopifyAccessTokenSource();
  logShopifyProductSync("started", {
    action,
    localProductId: productData.localProductId,
    localVariantId: productData.localVariantId ?? null,
    hasAccessToken: hasShopifyAccessToken(),
    tokenSource,
    hasFirebaseAdmin: isFirebaseAdminConfigured(),
    existingShopifyProductId: mapping?.shopifyProductId ?? null,
    existingShopifyVariantId: mapping?.shopifyVariantId ?? null
  });

  if (mapping?.shopifyProductId) {
    const result = await updateShopifyProduct({
      ...productData,
      shopifyProductId: mapping.shopifyProductId
    });

    return {
      success: true as const,
      action,
      localProductId: productData.localProductId,
      ...(productData.localVariantId ? { localVariantId: productData.localVariantId } : {}),
      responseStatus: result.responseStatus,
      shopifyProductId: String(result.product.id),
      ...(result.mapping?.shopifyVariantId ? { shopifyVariantId: result.mapping.shopifyVariantId } : {}),
      mappingWritten: Boolean(result.mapping),
      ...(result.mapping ? { mappingPath: `${SHOPIFY_PRODUCT_MAPPING_COLLECTION}/${productData.localProductId}` } : {}),
      tokenSource: tokenSource ?? "memory",
      shopifyProduct: result.product
    };
  }

  const result = await createShopifyProduct(productData);
  return {
    success: true as const,
    action,
    localProductId: productData.localProductId,
    ...(productData.localVariantId ? { localVariantId: productData.localVariantId } : {}),
    responseStatus: result.responseStatus,
    shopifyProductId: String(result.product.id),
    ...(result.mapping?.shopifyVariantId ? { shopifyVariantId: result.mapping.shopifyVariantId } : {}),
    mappingWritten: Boolean(result.mapping),
    ...(result.mapping ? { mappingPath: `${SHOPIFY_PRODUCT_MAPPING_COLLECTION}/${productData.localProductId}` } : {}),
    tokenSource: tokenSource ?? "memory",
    shopifyProduct: result.product
  };
}

async function readLocalProductImagesForSync(localProductId: string) {
  const snapshot = await getAdminDb().collection("products").doc(localProductId).collection("images").get();

  return snapshot.docs
    .flatMap((doc) => {
      const image = normalizeLegacyProductImage(
        {
          source: "shopify",
          productId: localProductId,
          imageId: doc.id
        },
        doc.data()
      );

      if (!image) {
        return [];
      }

      return {
        id: doc.id,
        productId: image.productId || localProductId,
        storagePath: image.storagePath,
        publicUrl: image.publicUrl ?? image.url!,
        altText: image.altText,
        sortOrder: image.sortOrder,
        isPrimary: image.isPrimary,
        shopifyImageId: image.shopifyImageId
      } satisfies LocalProductImageSyncInput;
    })
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

async function updateLocalProductImageSyncState(input: {
  localProductId: string;
  updates: Array<{
    imageId: string;
    syncStatus: "pending" | "synced" | "error";
    shopifyImageId?: string;
    syncError?: string;
  }>;
}) {
  if (input.updates.length === 0) {
    return;
  }

  const timestamp = nowIso();
  const productRef = getAdminDb().collection("products").doc(input.localProductId);
  const batch = getAdminDb().batch();

  for (const update of input.updates) {
    batch.set(
      productRef.collection("images").doc(update.imageId),
      {
        syncStatus: update.syncStatus,
        ...(update.shopifyImageId ? { shopifyImageId: update.shopifyImageId } : {}),
        syncError: update.syncError ? update.syncError : FieldValue.delete(),
        updatedAt: timestamp
      },
      { merge: true }
    );
  }

  await batch.commit();
}

async function listShopifyProductImages(shopifyProductId: string) {
  const response = await fetch(
    `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${shopifyProductId}/images.json`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Shopify-Access-Token": getShopifyAccessToken()
      },
      cache: "no-store"
    }
  );

  const payload = await parseJsonResponse<ShopifyProductImagesResponse>(response);
  if (!response.ok) {
    const shopifyError = extractShopifyError(payload);
    throw new ShopifyApiRequestError(
      `Shopify image list failed (${response.status}): ${shopifyError}`,
      response.status,
      shopifyError
    );
  }

  return payload?.images ?? [];
}

async function createShopifyProductImage(input: {
  shopifyProductId: string;
  src: string;
  alt: string;
  position: number;
}) {
  const response = await fetch(
    `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${input.shopifyProductId}/images.json`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": getShopifyAccessToken()
      },
      body: JSON.stringify({
        image: {
          src: input.src,
          alt: input.alt,
          position: input.position
        }
      }),
      cache: "no-store"
    }
  );

  const payload = await parseJsonResponse<ShopifyProductImagesResponse>(response);
  if (!response.ok || !payload?.image?.id) {
    const shopifyError = extractShopifyError(payload);
    throw new ShopifyApiRequestError(
      `Shopify image create failed (${response.status}): ${shopifyError}`,
      response.status,
      shopifyError
    );
  }

  return payload.image;
}

async function updateShopifyProductImage(input: {
  shopifyProductId: string;
  shopifyImageId: string;
  src: string;
  alt: string;
  position: number;
}) {
  const response = await fetch(
    `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${input.shopifyProductId}/images/${input.shopifyImageId}.json`,
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": getShopifyAccessToken()
      },
      body: JSON.stringify({
        image: {
          id: Number(input.shopifyImageId),
          src: input.src,
          alt: input.alt,
          position: input.position
        }
      }),
      cache: "no-store"
    }
  );

  const payload = await parseJsonResponse<ShopifyProductImagesResponse>(response);
  if (!response.ok || !payload?.image?.id) {
    const shopifyError = extractShopifyError(payload);
    throw new ShopifyApiRequestError(
      `Shopify image update failed (${response.status}): ${shopifyError}`,
      response.status,
      shopifyError
    );
  }

  return payload.image;
}

async function deleteShopifyProductImage(input: { shopifyProductId: string; shopifyImageId: string }) {
  const response = await fetch(
    `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${input.shopifyProductId}/images/${input.shopifyImageId}.json`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "X-Shopify-Access-Token": getShopifyAccessToken()
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    const payload = await parseJsonResponse<ShopifyProductImagesResponse>(response);
    const shopifyError = extractShopifyError(payload);
    throw new ShopifyApiRequestError(
      `Shopify image delete failed (${response.status}): ${shopifyError}`,
      response.status,
      shopifyError
    );
  }
}

export async function deleteShopifyProductImageForLocalProduct(input: {
  localProductId: string;
  shopifyImageId: string;
}) {
  const mapping = await getShopifyProductMapping(input.localProductId);
  if (!mapping?.shopifyProductId) {
    return { deleted: false, reason: "no_product_mapping" as const };
  }

  await deleteShopifyProductImage({
    shopifyProductId: mapping.shopifyProductId,
    shopifyImageId: input.shopifyImageId
  });

  return { deleted: true as const };
}

function matchesLocalProductImageSrc(src: string | undefined, localProductId: string) {
  if (!src) {
    return false;
  }

  return src.includes(`/${localProductId}%2Fimages%2F`) || src.includes(`/${localProductId}/images/`);
}

async function syncProductImagesToShopify(input: {
  localProductId: string;
  shopifyProductId: string;
}): Promise<ShopifyProductImageSyncSummary> {
  const localImages = await readLocalProductImagesForSync(input.localProductId);
  const remoteImages = await listShopifyProductImages(input.shopifyProductId);
  const remoteById = new Map(remoteImages.map((image) => [String(image.id), image]));
  const localSrcs = new Set(localImages.map((image) => image.publicUrl));
  const updates: Array<{
    imageId: string;
    syncStatus: "pending" | "synced" | "error";
    shopifyImageId?: string;
    syncError?: string;
  }> = [];
  const usedRemoteIds = new Set<string>();
  let createdCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;
  const errors: Array<{ imageId: string; message: string }> = [];

  for (const [index, image] of localImages.entries()) {
    try {
      const knownRemote =
        (image.shopifyImageId ? remoteById.get(String(image.shopifyImageId)) : undefined) ??
        remoteImages.find((remote) => remote.src === image.publicUrl && !usedRemoteIds.has(String(remote.id)));

      let syncedImage: ShopifyImageRecord;

      if (knownRemote?.id) {
        usedRemoteIds.add(String(knownRemote.id));
        syncedImage = await updateShopifyProductImage({
          shopifyProductId: input.shopifyProductId,
          shopifyImageId: String(knownRemote.id),
          src: image.publicUrl,
          alt: image.altText,
          position: index + 1
        });
        updatedCount += 1;
      } else {
        syncedImage = await createShopifyProductImage({
          shopifyProductId: input.shopifyProductId,
          src: image.publicUrl,
          alt: image.altText,
          position: index + 1
        });
        createdCount += 1;
      }

      if (syncedImage.id) {
        usedRemoteIds.add(String(syncedImage.id));
      }

      updates.push({
        imageId: image.id,
        syncStatus: "synced",
        shopifyImageId: syncedImage.id ? String(syncedImage.id) : image.shopifyImageId
      });
    } catch (error) {
      errors.push({
        imageId: image.id,
        message: getErrorMessage(error)
      });
      updates.push({
        imageId: image.id,
        syncStatus: "error",
        syncError: getErrorMessage(error)
      });
    }
  }

  for (const remoteImage of remoteImages) {
    const remoteId = remoteImage.id ? String(remoteImage.id) : null;
    if (!remoteId || usedRemoteIds.has(remoteId)) {
      continue;
    }

    if (!matchesLocalProductImageSrc(remoteImage.src, input.localProductId)) {
      continue;
    }

    if (remoteImage.src && localSrcs.has(remoteImage.src)) {
      continue;
    }

    try {
      await deleteShopifyProductImage({
        shopifyProductId: input.shopifyProductId,
        shopifyImageId: remoteId
      });
      deletedCount += 1;
    } catch (error) {
      errors.push({
        imageId: `remote:${remoteId}`,
        message: getErrorMessage(error)
      });
    }
  }

  await updateLocalProductImageSyncState({
    localProductId: input.localProductId,
    updates
  });

  return {
    success: errors.length === 0,
    syncedCount: updates.filter((update) => update.syncStatus === "synced").length,
    createdCount,
    updatedCount,
    deletedCount,
    failedCount: errors.length,
    failedImageIds: errors.map((error) => error.imageId),
    errors
  };
}

export async function syncProductToShopifyDetailed(productData: LocalProductSyncInput): Promise<ShopifyProductSyncResult> {
  try {
    const result = await syncProductToShopifyOrThrow(productData);
    const imageSync = await syncProductImagesToShopify({
      localProductId: productData.localProductId,
      shopifyProductId: result.shopifyProductId
    });

    if (!imageSync.success) {
      console.error("[shopify] product image sync failed:", {
        action: result.action,
        localProductId: result.localProductId,
        shopifyProductId: result.shopifyProductId,
        failedCount: imageSync.failedCount,
        failedImageIds: imageSync.failedImageIds
      });

      return {
        success: false,
        action: result.action,
        localProductId: result.localProductId,
        ...(result.localVariantId ? { localVariantId: result.localVariantId } : {}),
        responseStatus: result.responseStatus,
        error: `Shopify-Produktsync abgeschlossen, aber ${imageSync.failedCount} Bild-Upload(s) sind fehlgeschlagen.`,
        mappingWritten: false,
        tokenSource: result.tokenSource,
        imageSync
      };
    }

    logShopifyProductSync("completed", {
      action: result.action,
      localProductId: result.localProductId,
      localVariantId: result.localVariantId ?? null,
      responseStatus: result.responseStatus,
      shopifyProductId: result.shopifyProductId,
      shopifyVariantId: result.shopifyVariantId ?? null,
      mappingWritten: result.mappingWritten,
      mappingPath: result.mappingPath ?? null,
      tokenSource: result.tokenSource,
      imageSync
    });

    return {
      success: true,
      action: result.action,
      localProductId: result.localProductId,
      ...(result.localVariantId ? { localVariantId: result.localVariantId } : {}),
      responseStatus: result.responseStatus,
      shopifyProductId: result.shopifyProductId,
      ...(result.shopifyVariantId ? { shopifyVariantId: result.shopifyVariantId } : {}),
      mappingWritten: result.mappingWritten,
      ...(result.mappingPath ? { mappingPath: result.mappingPath } : {}),
      tokenSource: result.tokenSource,
      imageSync
    };
  } catch (error) {
    const responseStatus = error instanceof ShopifyApiRequestError ? error.responseStatus : undefined;
    const shopifyError = error instanceof ShopifyApiRequestError ? error.shopifyError : undefined;
    const tokenSource = getShopifyAccessTokenSource() ?? undefined;
    const action: "create" | "update" = (await getShopifyProductMapping(productData.localProductId))?.shopifyProductId
      ? "update"
      : "create";
    console.error("[shopify] product sync failed:", {
      action,
      localProductId: productData.localProductId,
      localVariantId: productData.localVariantId ?? null,
      responseStatus: responseStatus ?? null,
      error: getErrorMessage(error),
      shopifyError: shopifyError ?? null,
      hasAccessToken: hasShopifyAccessToken(),
      tokenSource: tokenSource ?? null,
      hasFirebaseAdmin: isFirebaseAdminConfigured()
    });

    return {
      success: false,
      action,
      localProductId: productData.localProductId,
      ...(productData.localVariantId ? { localVariantId: productData.localVariantId } : {}),
      ...(typeof responseStatus === "number" ? { responseStatus } : {}),
      error: getErrorMessage(error),
      ...(shopifyError ? { shopifyError } : {}),
      mappingWritten: false,
      ...(tokenSource ? { tokenSource } : {})
    };
  }
}

export async function syncProductToShopify(productData: LocalProductSyncInput) {
  const result = await syncProductToShopifyOrThrow(productData);
  return result.shopifyProduct;
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

function buildServerCheckoutSubtitle(line: ValidatedShopifyCheckoutPayload["lines"][number]["validated"]) {
  if (!line.productCollection || !line.productGlassType) {
    return undefined;
  }

  return `${line.productCollection} · ${line.productGlassType}`;
}

function buildValidatedCheckoutConfigurations(line: ValidatedShopifyCheckoutPayload["lines"][number]["validated"]) {
  if (line.configurations.length === 0) {
    return undefined;
  }

  return line.configurations.map((configuration) => ({
    optionId: configuration.optionId,
    value: configuration.value
  }));
}

async function resolveValidatedShopifyCheckoutLine(
  line: ValidatedShopifyCheckoutPayload["lines"][number]
): Promise<ResolvedCheckoutContextLine> {
  const mapping = await getShopifyProductMapping(line.validated.productId);
  if (!mapping?.shopifyProductId) {
    throw new Error(`No Shopify product mapping found for local product ${line.validated.productId}.`);
  }

  const shopifyVariantId = await resolveShopifyVariantId(line.validated.productId, line.validated.variantId);
  const { previewImage, previewImageStorage } = normalizePreviewImageForStorage(line.previewImage);
  const normalizedConfigurations = buildValidatedCheckoutConfigurations(line.validated);

  return {
    lineId: line.lineId,
    lineType: line.lineType === "custom-design" ? "custom-design" : "product",
    productId: line.validated.productId,
    variantId: line.validated.variantId,
    quantity: line.validated.quantity,
    shopifyProductId: mapping.shopifyProductId,
    shopifyVariantId,
    name: line.validated.productTitle,
    price: line.validated.lineTotalCents / line.validated.quantity / 100,
    ...(buildServerCheckoutSubtitle(line.validated) ? { subtitle: buildServerCheckoutSubtitle(line.validated) } : {}),
    ...(previewImage ? { previewImage } : {}),
    previewImageStorage,
    ...(normalizedConfigurations ? { configurations: normalizedConfigurations } : {}),
    ...(line.lineType === "custom-design"
      ? {
          customData: {
            checkoutType: "custom-design"
          }
        }
      : {})
  };
}

function buildShopifyLineSignature(lines: Array<Pick<ResolvedCheckoutContextLine, "shopifyVariantId" | "quantity">>) {
  return lines
    .map((line) => `${line.shopifyVariantId}:${line.quantity}`)
    .sort()
    .join("|");
}

function buildCheckoutContextNote(contextId: string) {
  return `${SHOPIFY_CHECKOUT_NOTE_PREFIX} ${contextId}`;
}

function appendCheckoutContextToCartUrl(baseUrl: string, contextId: string) {
  const url = new URL(baseUrl);
  url.searchParams.set(`attributes[${SHOPIFY_CHECKOUT_CONTEXT_ATTRIBUTE}]`, contextId);
  url.searchParams.set(`attributes[${SHOPIFY_CHECKOUT_SOURCE_ATTRIBUTE}]`, "laser-shop");
  url.searchParams.set("note", buildCheckoutContextNote(contextId));
  url.searchParams.set("ref", contextId);
  return url.toString();
}

async function createPendingCheckoutContext(input: {
  source: "buy_now" | "cart";
  lines: ResolvedCheckoutContextLine[];
}) {
  if (!isFirebaseAdminConfigured()) {
    throw new Error("Firebase admin is required to persist the Shopify checkout context.");
  }

  const db = getAdminDb();
  const timestamp = nowIso();
  const contextRef = db.collection(SHOPIFY_CHECKOUT_CONTEXT_COLLECTION).doc();
  const contextId = contextRef.id;
  const batch = db.batch();
  const checkoutContextDoc: ShopifyCheckoutContextDocument = {
    source: input.source,
    status: "pending",
    lineCount: input.lines.length,
    totalQuantity: input.lines.reduce((sum, line) => sum + line.quantity, 0),
    lineTypes: Array.from(new Set(input.lines.map((line) => line.lineType))),
    hasConfigurations: input.lines.some((line) => Boolean(line.configurations?.length)),
    hasCustomDesigns: input.lines.some((line) => line.lineType === "custom-design"),
    shopifyLineSignature: buildShopifyLineSignature(input.lines),
    shopifyNote: buildCheckoutContextNote(contextId),
    createdAt: timestamp,
    updatedAt: timestamp,
    expiresAt: plusHoursIso(timestamp, 72)
  };

  batch.set(contextRef, checkoutContextDoc);

  for (const line of input.lines) {
    const lineRef = contextRef.collection("lines").doc(line.lineId);
    const lineDoc: ShopifyCheckoutContextLineDocument = {
      lineType: line.lineType,
      productId: line.productId,
      variantId: line.variantId,
      quantity: line.quantity,
      shopifyProductId: line.shopifyProductId,
      shopifyVariantId: line.shopifyVariantId,
      ...(line.name ? { name: line.name } : {}),
      ...(typeof line.price === "number" ? { price: line.price } : {}),
      ...(line.image ? { image: line.image } : {}),
      ...(line.subtitle ? { subtitle: line.subtitle } : {}),
      ...(line.previewImage ? { previewImage: line.previewImage } : {}),
      previewImageStorage: line.previewImageStorage,
      ...(line.configurations?.length ? { configurations: line.configurations } : {}),
      ...(line.customData ? { customData: line.customData } : {}),
      createdAt: timestamp,
      updatedAt: timestamp
    };

    batch.set(lineRef, lineDoc);
  }

  await batch.commit();

  return { contextId };
}

async function createShopifyCheckoutWithContext(input: {
  source: "buy_now" | "cart";
  lines: CheckoutContextLineInput[];
}) {
  if (input.lines.length === 0) {
    throw new Error("Cannot create Shopify checkout for an empty cart.");
  }

  const validatedPayload = await validateShopifyCheckoutPayload(
    {
      lines: input.lines
    },
    {
      db: getAdminDb(),
      bucket: getAdminBucket()
    }
  );
  const resolvedLines = await Promise.all(validatedPayload.lines.map(resolveValidatedShopifyCheckoutLine));
  const { contextId } = await createPendingCheckoutContext({
    source: input.source,
    lines: resolvedLines
  });
  const baseUrl = `https://${SHOPIFY_SHOP_DOMAIN}/cart/${resolvedLines
    .map((line) => `${line.shopifyVariantId}:${line.quantity}`)
    .join(",")}`;

  return {
    checkoutUrl: appendCheckoutContextToCartUrl(baseUrl, contextId),
    checkoutContextId: contextId
  };
}

export async function createCheckoutSession(
  line: CheckoutContextLineInput
) {
  const result = await createShopifyCheckoutWithContext({
    source: "buy_now",
    lines: [line]
  });

  return result.checkoutUrl;
}

export async function createCartCheckoutSession(lines: CheckoutContextLineInput[]) {
  return (await createShopifyCheckoutWithContext({ source: "cart", lines })).checkoutUrl;
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

function toCents(value: unknown) {
  const amount = normalizeNumber(value);
  return typeof amount === "number" ? Math.round(amount * 100) : undefined;
}

function sanitizeFirestoreIdSegment(value: string) {
  return value.replace(/\//g, "_").slice(0, 180);
}

function sanitizeMirroredPreviewUrl(previewUrl?: string) {
  if (!previewUrl || previewUrl.startsWith("data:") || previewUrl.length > 2_000) {
    return undefined;
  }

  return previewUrl;
}

function normalizeNoteAttributes(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }

    const name =
      ("name" in entry && typeof entry.name === "string" && entry.name.trim().length > 0
        ? entry.name.trim()
        : "key" in entry && typeof entry.key === "string" && entry.key.trim().length > 0
          ? entry.key.trim()
          : undefined);
    const attributeValue = "value" in entry && typeof entry.value === "string" ? entry.value.trim() : undefined;

    if (!name || !attributeValue) {
      return [];
    }

    return [{ name, value: attributeValue }];
  });
}

function extractCheckoutContextIdFromNote(note?: string) {
  if (!note) {
    return undefined;
  }

  if (!note.startsWith(SHOPIFY_CHECKOUT_NOTE_PREFIX)) {
    return undefined;
  }

  const suffix = note.slice(SHOPIFY_CHECKOUT_NOTE_PREFIX.length).trim();
  return suffix || undefined;
}

async function getCheckoutContextSummary(contextId: string) {
  const snapshot = await getAdminDb().collection(SHOPIFY_CHECKOUT_CONTEXT_COLLECTION).doc(contextId).get();
  if (!snapshot.exists) {
    return null;
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as ShopifyCheckoutContextDocument)
  };
}

async function getCheckoutContextWithLines(contextId: string): Promise<ShopifyCheckoutContextWithLines | null> {
  const contextRef = getAdminDb().collection(SHOPIFY_CHECKOUT_CONTEXT_COLLECTION).doc(contextId);
  const [contextSnapshot, linesSnapshot] = await Promise.all([
    contextRef.get(),
    contextRef.collection("lines").orderBy("createdAt", "asc").get()
  ]);

  if (!contextSnapshot.exists) {
    return null;
  }

  return {
    id: contextSnapshot.id,
    ...(contextSnapshot.data() as ShopifyCheckoutContextDocument),
    lines: linesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as ShopifyCheckoutContextLineDocument)
    }))
  };
}

async function markCheckoutContextMatched(contextId: string, input: { orderId: string; orderName?: string }) {
  await getAdminDb()
    .collection(SHOPIFY_CHECKOUT_CONTEXT_COLLECTION)
    .doc(contextId)
    .set(
      {
        status: "matched",
        matchedOrderId: input.orderId,
        ...(input.orderName ? { matchedOrderName: input.orderName } : {}),
        matchedAt: nowIso(),
        updatedAt: nowIso()
      },
      { merge: true }
    );
}

async function resolveCheckoutContextForOrder(orderData: ShopifyIncomingOrder, lineItems: Array<{ variantId: string; quantity: number }>) {
  const noteAttributes = normalizeNoteAttributes(orderData.note_attributes);
  const directContextId =
    noteAttributes.find((attribute) => attribute.name === SHOPIFY_CHECKOUT_CONTEXT_ATTRIBUTE)?.value ??
    extractCheckoutContextIdFromNote(normalizeString(orderData.note));

  if (directContextId) {
    const directContext = await getCheckoutContextSummary(directContextId);
    if (directContext) {
      return {
        context: directContext,
        matchStrategy: "direct"
      } as const;
    }
  }

  const signature = buildShopifyLineSignature(
    lineItems
      .filter((line) => line.variantId)
      .map((line) => ({
        shopifyVariantId: line.variantId,
        quantity: line.quantity
      }))
  );
  if (!signature) {
    return {
      context: null,
      matchStrategy: "missing"
    } as const;
  }

  const matchingSnapshots = await getAdminDb()
    .collection(SHOPIFY_CHECKOUT_CONTEXT_COLLECTION)
    .where("shopifyLineSignature", "==", signature)
    .limit(10)
    .get();

  const candidates = matchingSnapshots.docs
    .map((doc) => ({
      id: doc.id,
      ...(doc.data() as ShopifyCheckoutContextDocument)
    }))
    .filter((context) => context.status === "pending")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  if (candidates.length === 1) {
    return {
      context: candidates[0],
      matchStrategy: "signature_fallback"
    } as const;
  }

  return {
    context: null,
    matchStrategy: candidates.length > 1 ? "ambiguous_signature" : "missing"
  } as const;
}

async function getOrderMirrorProductContext(
  productId: string,
  variantId: string,
  cache: Map<string, Promise<OrderMirrorProductContext>>
) {
  const cacheKey = `${productId}:${variantId}`;
  if (!cache.has(cacheKey)) {
    cache.set(
      cacheKey,
      (async () => {
        const productRef = getAdminDb().collection("products").doc(productId);
        const [productSnapshot, variantSnapshot, optionSnapshot] = await Promise.all([
          productRef.get(),
          productRef.collection("variants").doc(variantId).get(),
          productRef.collection("options").get()
        ]);

        if (!productSnapshot.exists) {
          throw new Error(`Mirror failed: unknown product ${productId}.`);
        }

        if (!variantSnapshot.exists) {
          throw new Error(`Mirror failed: unknown variant ${variantId} for product ${productId}.`);
        }

        const productDoc = productDocumentSchema.parse(productSnapshot.data());
        const variantDoc = productVariantDocumentSchema.parse(variantSnapshot.data());
        const options = await Promise.all(
          optionSnapshot.docs.map(async (optionDoc) => {
            const option = productOptionDocumentSchema.parse(optionDoc.data());
            const valuesSnapshot = await optionDoc.ref.collection("values").get();

            return {
              id: optionDoc.id,
              doc: option,
              values: valuesSnapshot.docs.map((valueDoc) => ({
                id: valueDoc.id,
                doc: productOptionValueDocumentSchema.parse(valueDoc.data())
              }))
            };
          })
        );

        return {
          productId,
          productTitle: productDoc.title,
          variantId,
          variantName: variantDoc.name,
          sku: variantDoc.sku,
          unitPriceCents: variantDoc.priceCents,
          productionTimeDays: variantDoc.productionTimeDays,
          options: options.filter((entry) => entry.doc.isActive).sort((left, right) => left.doc.sortOrder - right.doc.sortOrder)
        } satisfies OrderMirrorProductContext;
      })()
    );
  }

  return cache.get(cacheKey)!;
}

function getConfigurationPriceModifier(
  option: OrderMirrorProductContext["options"][number]["doc"],
  value: CartConfigurationInput["value"],
  optionValues: OrderMirrorProductContext["options"][number]["values"]
) {
  const baseModifier = option.priceModifierCents ?? 0;

  if (option.type === "checkbox") {
    return value === true && option.pricingMode === "fixed" ? baseModifier : 0;
  }

  if (option.type === "select") {
    const selectedValue = typeof value === "string" ? optionValues.find((entry) => entry.doc.value === value && entry.doc.isActive) : undefined;
    return (option.pricingMode === "fixed" ? baseModifier : 0) + (selectedValue?.doc.priceModifierCents ?? 0);
  }

  if (option.type === "text" || option.type === "textarea") {
    if (typeof value !== "string") {
      return 0;
    }

    if (option.pricingMode === "per_character") {
      return baseModifier * value.length;
    }

    return option.pricingMode === "fixed" ? baseModifier : 0;
  }

  return option.pricingMode === "fixed" ? baseModifier : 0;
}

function getRenderedConfigurationValue(
  option: OrderMirrorProductContext["options"][number]["doc"],
  value: CartConfigurationInput["value"],
  optionValues: OrderMirrorProductContext["options"][number]["values"]
) {
  if (option.type === "checkbox") {
    return value === true ? "Ja" : "Nein";
  }

  if (option.type === "select") {
    if (typeof value !== "string") {
      return "";
    }

    return optionValues.find((entry) => entry.doc.value === value && entry.doc.isActive)?.doc.label ?? value;
  }

  if (option.type === "file") {
    if (value && typeof value === "object" && !Array.isArray(value) && "originalFilename" in value && typeof value.originalFilename === "string") {
      return value.originalFilename;
    }

    return value && typeof value === "object" && !Array.isArray(value) && "uploadId" in value && typeof value.uploadId === "string"
      ? value.uploadId
      : "";
  }

  return typeof value === "string" ? value : "";
}

function mapFinancialStatusToPaymentStatus(financialStatus?: string): OrderDocument["paymentStatus"] {
  switch (financialStatus) {
    case "authorized":
      return "authorized";
    case "paid":
      return "paid";
    case "partially_refunded":
      return "partially_refunded";
    case "refunded":
      return "refunded";
    case "voided":
      return "failed";
    case "pending":
    case "partially_paid":
    default:
      return "pending";
  }
}

function deriveOrderStatus(input: {
  cancelledAt?: string | null;
  fulfillmentStatus?: string | null;
  paymentStatus: OrderDocument["paymentStatus"];
}): OrderDocument["orderStatus"] {
  if (input.cancelledAt || input.paymentStatus === "failed") {
    return "cancelled";
  }

  if (input.fulfillmentStatus === "fulfilled") {
    return "fulfilled";
  }

  return "placed";
}

function deriveProductionStatus(input: {
  cancelledAt?: string | null;
  fulfillmentStatus?: string | null;
}): OrderDocument["productionStatus"] {
  if (input.cancelledAt) {
    return "cancelled";
  }

  if (input.fulfillmentStatus === "fulfilled") {
    return "shipped";
  }

  return "queued";
}

function normalizeShopifyAddress(
  address: ShopifyIncomingOrder["shipping_address"] | ShopifyIncomingOrder["billing_address"] | undefined | null,
  fallback: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  }
): CustomerAddress | null {
  if (!address) {
    return null;
  }

  const firstName = normalizeString(address.first_name) ?? fallback.firstName;
  const lastName = normalizeString(address.last_name) ?? fallback.lastName;
  const line1 = normalizeString(address.address1);
  const postalCode = normalizeString(address.zip);
  const city = normalizeString(address.city);
  const countryCode = normalizeString(address.country_code);

  if (!firstName || !lastName || !line1 || !postalCode || !city || !countryCode || countryCode.length !== 2) {
    return null;
  }

  return {
    firstName,
    lastName,
    line1,
    postalCode,
    city,
    countryCode: countryCode.toUpperCase(),
    ...(normalizeString(address.company) ? { company: normalizeString(address.company) } : {}),
    ...(normalizeString(address.address2) ? { line2: normalizeString(address.address2) } : {}),
    ...(normalizeString(address.phone) ?? fallback.phone ? { phone: normalizeString(address.phone) ?? fallback.phone } : {})
  };
}

async function mirrorShopifyOrderToCanonicalOrders(input: {
  shopifyOrderId: string;
  orderData: ShopifyIncomingOrder;
  checkoutContext: ShopifyCheckoutContextWithLines | null;
  customer: {
    email?: string;
    firstName?: string;
    lastName?: string;
  };
}): Promise<OrderMirrorResult> {
  if (!input.checkoutContext) {
    return {
      status: "skipped",
      reason: "No checkout context matched the Shopify order."
    };
  }

  if (!input.customer.email || !input.customer.firstName || !input.customer.lastName) {
    return {
      status: "skipped",
      reason: "Customer identity is incomplete for canonical order mirroring."
    };
  }

  const shippingAddress =
    normalizeShopifyAddress(input.orderData.shipping_address, input.customer) ??
    normalizeShopifyAddress(input.orderData.billing_address, input.customer);

  if (!shippingAddress) {
    return {
      status: "skipped",
      reason: "Shipping address is missing or incomplete for canonical order mirroring."
    };
  }

  const billingAddress = normalizeShopifyAddress(input.orderData.billing_address, input.customer) ?? undefined;
  const orderDocId = `shopify-${sanitizeFirestoreIdSegment(input.shopifyOrderId)}`;
  const orderRef = getAdminDb().collection("orders").doc(orderDocId);
  const existingOrder = await orderRef.get();
  const existedBefore = existingOrder.exists;

  const productCache = new Map<string, Promise<OrderMirrorProductContext>>();
  const mirroredLines = await Promise.all(
    input.checkoutContext.lines.map(async (line, index) => {
      const productContext = await getOrderMirrorProductContext(line.productId, line.variantId, productCache);
      const configurations: Array<OrderItemConfigurationDocument & { id: string }> = [];

      for (const [configIndex, configuration] of (line.configurations ?? []).entries()) {
        const optionEntry = productContext.options.find((entry) => entry.id === configuration.optionId);
        if (!optionEntry) {
          throw new Error(`Mirror failed: unknown option ${configuration.optionId} for product ${line.productId}.`);
        }

        configurations.push({
          id: `cfg-${configIndex + 1}-${sanitizeFirestoreIdSegment(configuration.optionId)}`,
          optionId: configuration.optionId,
          optionCodeSnapshot: optionEntry.doc.code,
          optionNameSnapshot: optionEntry.doc.name,
          optionTypeSnapshot: optionEntry.doc.type,
          value: configuration.value,
          renderedValue: getRenderedConfigurationValue(optionEntry.doc, configuration.value, optionEntry.values),
          priceModifierSnapshotCents: getConfigurationPriceModifier(optionEntry.doc, configuration.value, optionEntry.values),
          ...(configuration.value && typeof configuration.value === "object" && !Array.isArray(configuration.value) && "uploadId" in configuration.value
            ? { uploadId: typeof configuration.value.uploadId === "string" ? configuration.value.uploadId : undefined }
            : {}),
          createdAt: normalizeString(input.orderData.created_at) ?? nowIso()
        });
      }

      const configurationTotalPerUnit = configurations.reduce((sum, configuration) => sum + configuration.priceModifierSnapshotCents, 0);
      const lineSubtotalCents = productContext.unitPriceCents * line.quantity;
      const lineTotalCents = (productContext.unitPriceCents + configurationTotalPerUnit) * line.quantity;

      return {
        id: `item-${index + 1}-${sanitizeFirestoreIdSegment(line.id)}`,
        item: {
          productId: line.productId,
          variantId: line.variantId,
          skuSnapshot: productContext.sku,
          productTitleSnapshot: productContext.productTitle,
          variantNameSnapshot: productContext.variantName,
          unitPriceSnapshotCents: productContext.unitPriceCents,
          quantity: line.quantity,
          lineSubtotalCents,
          lineTotalCents,
          isPersonalized: Boolean(configurations.length > 0 || line.customData || line.lineType === "custom-design"),
          ...(sanitizeMirroredPreviewUrl(line.previewImage) ? { designPreviewUrl: sanitizeMirroredPreviewUrl(line.previewImage) } : {}),
          ...(line.customData ? { customData: line.customData } : {}),
          createdAt: normalizeString(input.orderData.created_at) ?? nowIso()
        } satisfies OrderItemDocument,
        configurations,
        productionTimeDays: productContext.productionTimeDays
      };
    })
  );

  const createdAt = normalizeString(input.orderData.created_at) ?? nowIso();
  const subtotalCents =
    toCents(input.orderData.current_subtotal_price) ??
    toCents(input.orderData.subtotal_price) ??
    mirroredLines.reduce((sum, line) => sum + line.item.lineTotalCents, 0);
  const shippingTotalCents =
    Array.isArray(input.orderData.shipping_lines) && input.orderData.shipping_lines.length > 0
      ? input.orderData.shipping_lines.reduce((sum, line) => sum + (toCents(line.price) ?? 0), 0)
      : 0;
  const taxTotalCents = toCents(input.orderData.current_total_tax) ?? toCents(input.orderData.total_tax) ?? 0;
  const discountTotalCents = toCents(input.orderData.current_total_discounts) ?? toCents(input.orderData.total_discounts) ?? 0;
  const grandTotalCents =
    toCents(input.orderData.total_price) ??
    Math.max(subtotalCents + shippingTotalCents + taxTotalCents - discountTotalCents, 0);
  const paymentStatus = mapFinancialStatusToPaymentStatus(normalizeString(input.orderData.financial_status));
  const orderStatus = deriveOrderStatus({
    cancelledAt: input.orderData.cancelled_at,
    fulfillmentStatus: normalizeString(input.orderData.fulfillment_status),
    paymentStatus
  });
  const productionStatus = deriveProductionStatus({
    cancelledAt: input.orderData.cancelled_at,
    fulfillmentStatus: normalizeString(input.orderData.fulfillment_status)
  });
  const maxProductionTimeDays = Math.max(...mirroredLines.map((line) => line.productionTimeDays), 0);
  const orderNumber = normalizeString(input.orderData.name) ?? `SHOPIFY-${input.shopifyOrderId}`;
  const orderDoc: OrderDocument = {
    orderNumber,
    customerEmail: input.customer.email,
    customerFirstName: input.customer.firstName,
    customerLastName: input.customer.lastName,
    source: "shopify",
    currency: "EUR",
    subtotalCents,
    shippingTotalCents,
    taxTotalCents,
    discountTotalCents,
    grandTotalCents,
    paymentStatus,
    orderStatus,
    productionStatus,
    productionDueDate: plusDaysIso(createdAt, maxProductionTimeDays),
    shippingAddress,
    ...(billingAddress ? { billingAddress } : {}),
    notesInternal: `Mirrored from Shopify order ${input.shopifyOrderId} via checkout context ${input.checkoutContext.id}.`,
    itemCount: mirroredLines.reduce((sum, line) => sum + line.item.quantity, 0),
    maxProductionTimeDays,
    createdAt,
    updatedAt: nowIso()
  };

  await orderRef.set(orderDoc, { merge: false });

  for (const mirroredLine of mirroredLines) {
    const itemRef = orderRef.collection("items").doc(mirroredLine.id);
    await itemRef.set(mirroredLine.item, { merge: false });

    for (const configuration of mirroredLine.configurations) {
      await itemRef.collection("configurations").doc(configuration.id).set(configuration, { merge: false });
    }
  }

  return {
    status: existedBefore ? "already_mirrored" : "mirrored",
    canonicalOrderId: orderRef.id,
    canonicalOrderNumber: orderNumber
  };
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

  const checkoutContextMatch = await resolveCheckoutContextForOrder(orderData, lineItems);
  const checkoutContext = checkoutContextMatch.context
    ? await getCheckoutContextWithLines(checkoutContextMatch.context.id)
    : null;
  if (checkoutContextMatch.context) {
    await markCheckoutContextMatched(checkoutContextMatch.context.id, {
      orderId,
      orderName: normalizeString(orderData.name)
    });
  }

  let orderMirrorResult: OrderMirrorResult = {
    status: "skipped",
    reason: "Canonical mirror was not attempted."
  };

  try {
    orderMirrorResult = await mirrorShopifyOrderToCanonicalOrders({
      shopifyOrderId: orderId,
      orderData,
      checkoutContext,
      customer: {
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName
      }
    });
  } catch (error) {
    orderMirrorResult = {
      status: "failed",
      reason: getErrorMessage(error)
    };
    console.error("[shopify] canonical order mirror failed:", {
      shopifyOrderId: orderId,
      checkoutContextId: checkoutContext?.id ?? null,
      error
    });
  }

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
        note: normalizeString(orderData.note),
        noteAttributes: normalizeNoteAttributes(orderData.note_attributes),
        checkoutContextId: checkoutContextMatch.context?.id,
        checkoutContextPath: checkoutContextMatch.context
          ? `${SHOPIFY_CHECKOUT_CONTEXT_COLLECTION}/${checkoutContextMatch.context.id}`
          : undefined,
        checkoutContextMatchStrategy: checkoutContextMatch.matchStrategy,
        checkoutContextSummary: checkoutContextMatch.context
          ? {
              source: checkoutContextMatch.context.source,
              status: checkoutContextMatch.context.status,
              lineCount: checkoutContextMatch.context.lineCount,
              totalQuantity: checkoutContextMatch.context.totalQuantity,
              lineTypes: checkoutContextMatch.context.lineTypes,
              hasConfigurations: checkoutContextMatch.context.hasConfigurations,
              hasCustomDesigns: checkoutContextMatch.context.hasCustomDesigns
            }
          : undefined,
        canonicalMirrorStatus: orderMirrorResult.status,
        canonicalMirrorReason: "reason" in orderMirrorResult ? orderMirrorResult.reason : undefined,
        canonicalOrderId: "canonicalOrderId" in orderMirrorResult ? orderMirrorResult.canonicalOrderId : undefined,
        canonicalOrderPath:
          "canonicalOrderId" in orderMirrorResult ? `orders/${orderMirrorResult.canonicalOrderId}` : undefined,
        canonicalOrderNumber:
          "canonicalOrderNumber" in orderMirrorResult ? orderMirrorResult.canonicalOrderNumber : undefined,
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
    lineItemCount: lineItems.length,
    checkoutContextId: checkoutContextMatch.context?.id ?? null,
    canonicalMirrorStatus: orderMirrorResult.status
  };
}

export { getErrorMessage as getShopifyIntegrationErrorMessage };
