import "server-only";

import { getAdminDb } from "@/lib/firebase/admin";
import type { AdminProductSummary } from "@/lib/server/admin-products";
import { getAdminEditableProduct, toAdminProductSummary } from "@/lib/server/admin-products";
import { revalidateShopCatalog } from "@/lib/server/catalog-revalidation";
import {
  getProductPublicationErrorMessage,
  syncProductStatusToShopify,
  validateProductForPublishing,
  type ProductPublicationIssue
} from "@/lib/server/product-publication";
import type { ProductStatus } from "@/shared/catalog";

function nowIso() {
  return new Date().toISOString();
}

export type ProductStatusUpdateSuccess = {
  ok: true;
  changed: boolean;
  productId: string;
  status: ProductStatus;
  summary: AdminProductSummary;
  shopifySync: Awaited<ReturnType<typeof syncProductStatusToShopify>>;
  message: string;
};

export type ProductStatusUpdateFailure = {
  ok: false;
  productId: string;
  status: ProductStatus;
  error: string;
  validationIssues?: ProductPublicationIssue[];
};

export type ProductStatusUpdateResult = ProductStatusUpdateSuccess | ProductStatusUpdateFailure;

export async function updateProductStatus(input: {
  productId: string;
  status: ProductStatus;
}): Promise<ProductStatusUpdateResult> {
  const existingProduct = await getAdminEditableProduct(input.productId);
  if (!existingProduct) {
    return {
      ok: false,
      productId: input.productId,
      status: input.status,
      error: "Produkt nicht gefunden."
    };
  }

  if (input.status === "active") {
    const validation = validateProductForPublishing(existingProduct);
    if (!validation.isPublishable) {
      return {
        ok: false,
        productId: input.productId,
        status: input.status,
        error: getProductPublicationErrorMessage(validation),
        validationIssues: validation.issues
      };
    }
  }

  const timestamp = nowIso();

  await getAdminDb()
    .collection("products")
    .doc(input.productId)
    .set(
      {
        status: input.status,
        shopifySyncStatus: "pending",
        shopifyLastAttemptedAt: timestamp,
        updatedAt: timestamp
      },
      { merge: true }
    );

  const productForSync = await getAdminEditableProduct(input.productId);
  if (!productForSync) {
    return {
      ok: false,
      productId: input.productId,
      status: input.status,
      error: "Produkt konnte nach dem Statuswechsel nicht mehr geladen werden."
    };
  }

  const shopifySync = await syncProductStatusToShopify({
    productId: input.productId,
    product: productForSync
  });

  const refreshedProduct = await getAdminEditableProduct(input.productId);
  if (!refreshedProduct) {
    return {
      ok: false,
      productId: input.productId,
      status: input.status,
      error: "Produkt konnte nach der Synchronisierung nicht geladen werden."
    };
  }

  revalidateShopCatalog({
    currentProduct: refreshedProduct,
    previousProduct: existingProduct
  });

  return {
    ok: true,
    changed: existingProduct.status !== input.status,
    productId: input.productId,
    status: input.status,
    summary: toAdminProductSummary({
      ...refreshedProduct,
      variantCount: refreshedProduct.variants.length
    }),
    shopifySync,
    message:
      input.status === "active"
        ? "Produkt ist jetzt im Shop sichtbar."
        : input.status === "draft"
          ? "Produkt wurde im Shop verborgen."
          : "Produkt wurde archiviert und aus dem Shop entfernt."
  };
}

export async function bulkUpdateProductStatus(input: {
  productIds: string[];
  status: ProductStatus;
}) {
  const uniqueProductIds = Array.from(new Set(input.productIds.filter(Boolean)));
  const results: ProductStatusUpdateResult[] = [];

  for (const productId of uniqueProductIds) {
    results.push(
      await updateProductStatus({
        productId,
        status: input.status
      })
    );
  }

  const successes = results.filter((result): result is ProductStatusUpdateSuccess => result.ok);
  const failures = results.filter((result): result is ProductStatusUpdateFailure => !result.ok);

  return {
    status: input.status,
    totalCount: uniqueProductIds.length,
    successCount: successes.length,
    failureCount: failures.length,
    results,
    updatedProducts: successes.map((result) => result.summary)
  };
}
