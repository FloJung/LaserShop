import type { CollectionSlug, Product, ShopCategorySlug } from "@/lib/types";
import { getStorefrontProductById, getStorefrontProducts } from "@/lib/server/catalog-source";
import {
  getStorefrontCollections,
  getStorefrontShopCategories
} from "@/lib/server/product-taxonomies";
import { getShopFilters } from "@/lib/server/shop-filters";

export function isProductFeatured(product: Product) {
  return product.featured;
}

export async function getFeaturedProducts(limit = 8) {
  return (await getStorefrontProducts()).filter(isProductFeatured).slice(0, limit);
}

export async function getProductsByCollection(slug: CollectionSlug) {
  return (await getStorefrontProducts()).filter((product) => product.collectionSlug === slug);
}

export async function getCollection(slug: CollectionSlug) {
  return (await getStorefrontCollections()).find((collection) => collection.slug === slug);
}

export async function getProductsByGlassType(glassType: string) {
  return (await getStorefrontProducts()).filter((product) => product.glassType === glassType);
}

export async function getProductsByShopCategory(slug: ShopCategorySlug) {
  return (await getStorefrontProducts()).filter((product) => product.shopCategory === slug);
}

export async function getShopCategory(slug: ShopCategorySlug) {
  return (await getStorefrontShopCategories()).find((category) => category.slug === slug);
}

export async function getProductById(id: string) {
  return getStorefrontProductById(id);
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
    return [
      product.name,
      product.category,
      product.collection,
      product.designer,
      product.glassType,
      product.occasion,
      product.shopCategory
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized);
  });
}

export async function filterProducts(params: {
  category?: string;
  shopCategory?: string;
  search?: string;
  glassType?: string;
  collection?: string;
  occasion?: string;
}) {
  const base = await searchProducts(params.search ?? "");

  return base.filter((product) => {
    const matchesCategory = !params.category || product.category === params.category;
    const matchesShopCategory = !params.shopCategory || product.shopCategory === params.shopCategory;
    const matchesGlass = !params.glassType || product.glassType === params.glassType;
    const matchesCollection = !params.collection || product.collectionSlug === params.collection;
    const matchesOccasion = !params.occasion || product.occasion === params.occasion;

    return matchesCategory && matchesShopCategory && matchesGlass && matchesCollection && matchesOccasion;
  });
}

export async function getFilterOptions() {
  return getShopFilters();
}

