import "server-only";

import { getAdminDb } from "@/lib/firebase/admin";
import { normalizeLegacyProductImage } from "@/lib/server/product-image-normalization";
import {
  productDocumentSchema,
  productOptionDocumentSchema,
  productOptionValueDocumentSchema,
  productVariantDocumentSchema
} from "@/shared/catalog";

export type AdminProductSummary = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "active" | "archived";
  category: string;
  shopCategory: string;
  glassType: string;
  collection: string;
  featured: boolean;
  variantCount: number;
  updatedAt: string;
  shopifySyncStatus?: "pending" | "synced" | "error";
  shopifySyncError?: string;
  shopifyLastSyncedAt?: string;
  shopifyLastAttemptedAt?: string;
};

export type AdminEditableProduct = ReturnType<typeof productDocumentSchema.parse> & {
  id: string;
  variants: Awaited<ReturnType<typeof readVariants>>;
  images: Awaited<ReturnType<typeof readImages>>;
  options: Awaited<ReturnType<typeof readOptions>>;
};

type ProductSummaryInput = Pick<
  AdminEditableProduct,
  | "id"
  | "title"
  | "slug"
  | "status"
  | "category"
  | "shopCategory"
  | "glassType"
  | "collection"
  | "featured"
  | "updatedAt"
  | "shopifySyncStatus"
  | "shopifySyncError"
  | "shopifyLastSyncedAt"
  | "shopifyLastAttemptedAt"
> & {
  variantCount: number;
};

export function toAdminProductSummary(product: ProductSummaryInput): AdminProductSummary {
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    status: product.status,
    category: product.category,
    shopCategory: product.shopCategory,
    glassType: product.glassType,
    collection: product.collection,
    featured: product.featured,
    variantCount: product.variantCount,
    updatedAt: product.updatedAt,
    shopifySyncStatus: product.shopifySyncStatus,
    shopifySyncError: product.shopifySyncError,
    shopifyLastSyncedAt: product.shopifyLastSyncedAt,
    shopifyLastAttemptedAt: product.shopifyLastAttemptedAt
  };
}

async function readVariants(productId: string) {
  const snapshot = await getAdminDb().collection("products").doc(productId).collection("variants").get();
  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...productVariantDocumentSchema.parse(doc.data())
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

async function readImages(productId: string) {
  const snapshot = await getAdminDb().collection("products").doc(productId).collection("images").get();
  return snapshot.docs
    .flatMap((doc) => {
      const image = normalizeLegacyProductImage(
        {
          source: "admin",
          productId,
          imageId: doc.id
        },
        doc.data()
      );

      if (!image) {
        return [];
      }

      return {
        id: doc.id,
        ...image,
        productId: image.productId || productId,
        url: image.url ?? image.publicUrl!,
        publicUrl: image.publicUrl ?? image.url!,
        syncStatus: image.syncStatus ?? "pending",
        updatedAt: image.updatedAt ?? image.createdAt
      };
    })
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

async function readOptions(productId: string) {
  const snapshot = await getAdminDb().collection("products").doc(productId).collection("options").get();

  const options = await Promise.all(
    snapshot.docs.map(async (optionDoc) => {
      const option = productOptionDocumentSchema.parse(optionDoc.data());
      const valuesSnapshot = await optionDoc.ref.collection("values").get();
      const values = valuesSnapshot.docs
        .map((valueDoc) => ({
          id: valueDoc.id,
          ...productOptionValueDocumentSchema.parse(valueDoc.data())
        }))
        .sort((left, right) => left.sortOrder - right.sortOrder);

      return {
        id: optionDoc.id,
        ...option,
        values
      };
    })
  );

  return options.sort((left, right) => left.sortOrder - right.sortOrder);
}

export async function getAdminProductSummaries(limit = 100): Promise<AdminProductSummary[]> {
  const snapshot = await getAdminDb().collection("products").orderBy("updatedAt", "desc").limit(limit).get();

  const summaries = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const product = productDocumentSchema.parse(doc.data());
      const variantsSnapshot = await doc.ref.collection("variants").count().get();

      return toAdminProductSummary({
        id: doc.id,
        ...product,
        variantCount: variantsSnapshot.data().count
      });
    })
  );

  return summaries;
}

export async function getAdminEditableProduct(productId: string): Promise<AdminEditableProduct | null> {
  const doc = await getAdminDb().collection("products").doc(productId).get();
  if (!doc.exists) {
    return null;
  }

  const product = productDocumentSchema.parse(doc.data());
  const [variants, images, options] = await Promise.all([
    readVariants(productId),
    readImages(productId),
    readOptions(productId)
  ]);

  return {
    id: doc.id,
    ...product,
    variants,
    images,
    options
  };
}
