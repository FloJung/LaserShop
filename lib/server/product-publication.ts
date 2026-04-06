import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type { AdminEditableProduct } from "@/lib/server/admin-products";
import type { ShopifyProductSyncResult } from "@/lib/server/shopify";
import { syncProductToShopifyDetailed } from "@/lib/server/shopify";

export {
  getProductPublicationChecklist,
  getProductPublicationErrorMessage,
  isProductReadyForPublishing,
  isProductVisibleInShop,
  validateProductForPublishing
} from "@/shared/catalog/publication";
export type {
  ProductPublicationChecklist,
  ProductPublicationChecklistItem,
  ProductPublicationChecklistStatus,
  ProductPublicationIssue,
  ProductPublicationValidation,
  PublishableImageInput,
  PublishableProductInput,
  PublishableVariantInput
} from "@/shared/catalog/publication";

function nowIso() {
  return new Date().toISOString();
}

export function getShopifySyncPayload(productId: string, product: AdminEditableProduct) {
  const preferredVariant =
    product.variants.find((variant) => variant.id === product.defaultVariantId && variant.isActive) ??
    product.variants.find((variant) => variant.isActive) ??
    product.variants[0];

  if (!preferredVariant) {
    throw new Error(`Product ${productId} has no variants.`);
  }

  return {
    localProductId: productId,
    localVariantId: preferredVariant.id,
    title: product.title,
    description: product.longDescription || product.shortDescription,
    price: preferredVariant.priceCents / 100,
    sku: preferredVariant.sku,
    status: product.status
  } as const;
}

export async function storeShopifySyncState(input: {
  productId: string;
  syncResult: ShopifyProductSyncResult;
}) {
  const timestamp = nowIso();
  const syncResult = input.syncResult;

  await getAdminDb()
    .collection("products")
    .doc(input.productId)
    .set(
      {
        shopifySyncStatus: syncResult.success ? "synced" : "error",
        shopifyLastAttemptedAt: timestamp,
        ...(syncResult.success ? { shopifyLastSyncedAt: timestamp } : {}),
        shopifySyncError: syncResult.success
          ? FieldValue.delete()
          : syncResult.shopifyError ?? syncResult.error
      },
      { merge: true }
    );
}

export async function syncProductStatusToShopify(input: {
  productId: string;
  product: AdminEditableProduct;
}) {
  const syncResult = await syncProductToShopifyDetailed(getShopifySyncPayload(input.productId, input.product));
  await storeShopifySyncState({
    productId: input.productId,
    syncResult
  });

  return syncResult;
}
