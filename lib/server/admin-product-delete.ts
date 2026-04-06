import "server-only";

import { getAdminDb } from "@/lib/firebase/admin";
import { getAdminEditableProduct } from "@/lib/server/admin-products";
import { revalidateShopCatalog } from "@/lib/server/catalog-revalidation";

async function commitDeleteChunks(paths: Array<{ path: string }>) {
  const db = getAdminDb();

  for (let index = 0; index < paths.length; index += 400) {
    const batch = db.batch();
    const chunk = paths.slice(index, index + 400);

    for (const entry of chunk) {
      batch.delete(db.doc(entry.path));
    }

    await batch.commit();
  }
}

function buildDeletePaths(productId: string, input: Awaited<ReturnType<typeof getAdminEditableProduct>>) {
  if (!input) {
    return [];
  }

  const productBasePath = `products/${productId}`;
  const deletePaths: Array<{ path: string }> = [];

  for (const variant of input.variants) {
    deletePaths.push({
      path: `${productBasePath}/variants/${variant.id}`
    });
  }

  for (const image of input.images) {
    deletePaths.push({
      path: `${productBasePath}/images/${image.id}`
    });
  }

  for (const option of input.options) {
    for (const value of option.values) {
      deletePaths.push({
        path: `${productBasePath}/options/${option.id}/values/${value.id}`
      });
    }

    deletePaths.push({
      path: `${productBasePath}/options/${option.id}`
    });
  }

  deletePaths.push({ path: `shopifyProductMappings/${productId}` });
  deletePaths.push({ path: productBasePath });

  return deletePaths;
}

export type ProductDeleteSuccess = {
  ok: true;
  productId: string;
  title: string;
  message: string;
};

export type ProductDeleteFailure = {
  ok: false;
  productId: string;
  error: string;
};

export type ProductDeleteResult = ProductDeleteSuccess | ProductDeleteFailure;

export async function deleteProduct(productId: string): Promise<ProductDeleteResult> {
  const existingProduct = await getAdminEditableProduct(productId);
  if (!existingProduct) {
    return {
      ok: false,
      productId,
      error: "Produkt nicht gefunden."
    };
  }

  try {
    await commitDeleteChunks(buildDeletePaths(productId, existingProduct));
    revalidateShopCatalog({
      previousProduct: existingProduct
    });

    return {
      ok: true,
      productId,
      title: existingProduct.title,
      message: `Produkt "${existingProduct.title}" wurde geloescht.`
    };
  } catch (error) {
    return {
      ok: false,
      productId,
      error: error instanceof Error ? error.message : "Produkt konnte nicht geloescht werden."
    };
  }
}

export async function bulkDeleteProducts(input: { productIds: string[] }) {
  const uniqueProductIds = Array.from(new Set(input.productIds.filter(Boolean)));
  const results: ProductDeleteResult[] = [];

  for (const productId of uniqueProductIds) {
    results.push(await deleteProduct(productId));
  }

  const successes = results.filter((result): result is ProductDeleteSuccess => result.ok);
  const failures = results.filter((result): result is ProductDeleteFailure => !result.ok);

  return {
    totalCount: uniqueProductIds.length,
    successCount: successes.length,
    failureCount: failures.length,
    deletedProductIds: successes.map((result) => result.productId),
    results
  };
}
