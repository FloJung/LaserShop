import { collections, glassTypes, occasions, products, shopCategories } from "@/lib/data/products";
import type { CollectionSlug, Product, ShopCategorySlug } from "@/lib/types";

export function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(price);
}

export function getFeaturedProducts(limit = 8) {
  return products.filter((product) => product.featured).slice(0, limit);
}

export function getProductsByCollection(slug: CollectionSlug) {
  return products.filter((product) => product.collectionSlug === slug);
}

export function getCollection(slug: CollectionSlug) {
  return collections.find((collection) => collection.slug === slug);
}

export function getProductsByGlassType(glassType: string) {
  return products.filter((product) => product.glassType === glassType);
}

export function getProductsByShopCategory(slug: ShopCategorySlug) {
  return products.filter((product) => product.shopCategory === slug);
}

export function getShopCategory(slug: ShopCategorySlug) {
  return shopCategories.find((category) => category.slug === slug);
}

export function getProductById(id: string) {
  return products.find((product) => product.id === id);
}

export function getSimilarProducts(product: Product, limit = 4) {
  return products
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

export function searchProducts(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return products;
  }

  return products.filter((product) => {
    return [product.name, product.collection, product.designer, product.glassType, product.occasion, product.shopCategory]
      .join(" ")
      .toLowerCase()
      .includes(normalized);
  });
}

export function filterProducts(params: {
  search?: string;
  glassType?: string;
  collection?: string;
  occasion?: string;
}) {
  const base = searchProducts(params.search ?? "");

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

