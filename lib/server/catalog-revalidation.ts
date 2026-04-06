import "server-only";

import { revalidatePath } from "next/cache";

type CatalogPathInput = {
  id: string;
  glassType: string;
  shopCategory: string;
  collectionSlug: string;
};

function collectCatalogPaths(product: CatalogPathInput) {
  return [
    "/",
    "/shop",
    `/products/${product.id}`,
    `/category/${encodeURIComponent(product.glassType)}`,
    `/category/${encodeURIComponent(product.shopCategory)}`,
    `/collections/${encodeURIComponent(product.collectionSlug)}`
  ];
}

export function revalidateShopCatalog(input: {
  currentProduct?: CatalogPathInput | null;
  previousProduct?: CatalogPathInput | null;
}) {
  const paths = new Set<string>(["/", "/shop"]);

  if (input.currentProduct) {
    for (const path of collectCatalogPaths(input.currentProduct)) {
      paths.add(path);
    }
  }

  if (input.previousProduct) {
    for (const path of collectCatalogPaths(input.previousProduct)) {
      paths.add(path);
    }
  }

  for (const path of paths) {
    revalidatePath(path);
  }
}
