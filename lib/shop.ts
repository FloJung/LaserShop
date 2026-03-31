import { collections, glassTypes, occasions, shopCategories } from "@/lib/data/products";
import type { CollectionSlug, Product, ShopCategorySlug } from "@/lib/types";
import { getStorefrontProducts } from "@/lib/server/catalog-source";

export async function getFeaturedProducts(limit = 8) {
  return (await getStorefrontProducts()).filter((product) => product.featured).slice(0, limit);
}

export async function getProductsByCollection(slug: CollectionSlug) {
  return (await getStorefrontProducts()).filter((product) => product.collectionSlug === slug);
}

export function getCollection(slug: CollectionSlug) {
  return collections.find((collection) => collection.slug === slug);
}

export async function getProductsByGlassType(glassType: string) {
  return (await getStorefrontProducts()).filter((product) => product.glassType === glassType);
}

export async function getProductsByShopCategory(slug: ShopCategorySlug) {
  return (await getStorefrontProducts()).filter((product) => product.shopCategory === slug);
}

export function getShopCategory(slug: ShopCategorySlug) {
  return shopCategories.find((category) => category.slug === slug);
}

export async function getProductById(id: string) {
  return (await getStorefrontProducts()).find((product) => product.id === id);
}

export async function getSimilarProducts(product: Product, limit = 4) {
  return (await getStorefrontProducts())
    .filter(
      (item) =>
        item.id !== product.id &&
        (
          item.glassType === product.glassType ||
          item.collectionSlug === product.collectionSlug ||
          item.shopCategory === product.shopCategory
        )
    )
    .slice(0, limit);
}

export async function searchProducts(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return getStorefrontProducts();
  }

  return (await getStorefrontProducts()).filter((product) => {
    return [product.name, product.collection, product.designer, product.glassType, product.occasion, product.shopCategory]
      .join(" ")
      .toLowerCase()
      .includes(normalized);
  });
}

export async function filterProducts(params: {
  search?: string;
  glassType?: string;
  collection?: string;
  occasion?: string;
}) {
  const base = await searchProducts(params.search ?? "");

  return base.filter((product) => {
    const matchesGlass = !params.glassType || product.glassType === params.glassType;
    const matchesCollection = !params.collection || product.collectionSlug === params.collection;
    const matchesOccasion = !params.occasion || product.occasion === params.occasion;

    return matchesGlass && matchesCollection && matchesOccasion;
  });
}

export const filterOptions = {
  glassTypes,
  occasions,
  collections,
  shopCategories
};

