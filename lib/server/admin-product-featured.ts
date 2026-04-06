import "server-only";

import { getAdminDb } from "@/lib/firebase/admin";
import { getAdminEditableProduct, toAdminProductSummary } from "@/lib/server/admin-products";
import { revalidateShopCatalog } from "@/lib/server/catalog-revalidation";

function nowIso() {
  return new Date().toISOString();
}

export type ProductFeaturedUpdateSuccess = {
  ok: true;
  changed: boolean;
  productId: string;
  featured: boolean;
  updatedAt: string;
  summary: ReturnType<typeof toAdminProductSummary>;
  message: string;
};

export type ProductFeaturedUpdateFailure = {
  ok: false;
  productId: string;
  featured: boolean;
  error: string;
};

export type ProductFeaturedUpdateResult = ProductFeaturedUpdateSuccess | ProductFeaturedUpdateFailure;

export async function updateProductFeaturedStatus(input: {
  productId: string;
  featured: boolean;
}): Promise<ProductFeaturedUpdateResult> {
  const existingProduct = await getAdminEditableProduct(input.productId);
  if (!existingProduct) {
    return {
      ok: false,
      productId: input.productId,
      featured: input.featured,
      error: "Produkt nicht gefunden."
    };
  }

  const timestamp = nowIso();

  await getAdminDb()
    .collection("products")
    .doc(input.productId)
    .set(
      {
        featured: input.featured,
        updatedAt: timestamp
      },
      { merge: true }
    );

  const refreshedProduct = await getAdminEditableProduct(input.productId);
  if (!refreshedProduct) {
    return {
      ok: false,
      productId: input.productId,
      featured: input.featured,
      error: "Produkt konnte nach der Bestseller-Aenderung nicht geladen werden."
    };
  }

  revalidateShopCatalog({
    currentProduct: refreshedProduct,
    previousProduct: existingProduct
  });

  return {
    ok: true,
    changed: existingProduct.featured !== input.featured,
    productId: input.productId,
    featured: input.featured,
    updatedAt: refreshedProduct.updatedAt,
    summary: toAdminProductSummary({
      ...refreshedProduct,
      variantCount: refreshedProduct.variants.length
    }),
    message: input.featured
      ? refreshedProduct.status === "active"
        ? "Produkt ist jetzt als Bestseller markiert und auf der Startseite beruecksichtigt."
        : "Produkt ist als Bestseller markiert. Sichtbar wird es erst, wenn der Status auf active steht."
      : "Produkt wurde aus den Bestsellern entfernt."
  };
}

export function setProductAsBestseller(productId: string) {
  return updateProductFeaturedStatus({
    productId,
    featured: true
  });
}

export function removeProductFromBestseller(productId: string) {
  return updateProductFeaturedStatus({
    productId,
    featured: false
  });
}
