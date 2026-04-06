import "server-only";

import { revalidatePath } from "next/cache";
import type { ProductTaxonomyKind } from "@/shared/catalog";

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
    ...(product.glassType ? [`/category/${encodeURIComponent(product.glassType)}`] : []),
    ...(product.shopCategory ? [`/category/${encodeURIComponent(product.shopCategory)}`] : []),
    ...(product.collectionSlug ? [`/collections/${encodeURIComponent(product.collectionSlug)}`] : [])
  ];
}

export function revalidateShopCatalog(input: {
  currentProduct?: CatalogPathInput | null;
  previousProduct?: CatalogPathInput | null;
  extraPaths?: string[];
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

  for (const path of input.extraPaths ?? []) {
    paths.add(path);
  }

  for (const path of paths) {
    revalidatePath(path);
  }

  revalidatePath("/", "layout");
}

export function getTaxonomyRevalidationPaths(input: {
  kind: ProductTaxonomyKind;
  previousSlug?: string;
  nextSlug?: string;
  previousName?: string;
  nextName?: string;
}) {
  const paths = new Set<string>(["/", "/shop"]);

  if (input.kind === "collection") {
    if (input.previousSlug) {
      paths.add(`/collections/${encodeURIComponent(input.previousSlug)}`);
    }

    if (input.nextSlug) {
      paths.add(`/collections/${encodeURIComponent(input.nextSlug)}`);
    }
  }

  if (input.kind === "shopCategory") {
    if (input.previousSlug) {
      paths.add(`/category/${encodeURIComponent(input.previousSlug)}`);
    }

    if (input.nextSlug) {
      paths.add(`/category/${encodeURIComponent(input.nextSlug)}`);
    }
  }

  if (input.kind === "glassType") {
    if (input.previousName) {
      paths.add(`/category/${encodeURIComponent(input.previousName)}`);
    }

    if (input.nextName) {
      paths.add(`/category/${encodeURIComponent(input.nextName)}`);
    }
  }

  return Array.from(paths);
}
