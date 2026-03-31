import type { Product } from "@/lib/types";
import type { CoasterDesignDocument } from "@/lib/design-tool";
import { getProductById } from "@/lib/shop";

export const CUSTOM_COASTER_PRODUCT = {
  id: "gu-custom",
  name: "Glasuntersätzer Custom",
  price: 24.9,
  image: "/images/untersetzer/Untersetzer-mit-Gravur-Kork-mit-Spruch-Mama-braucht-Kaffee.jpg"
} as const;

const DEFAULT_GLASS_IMAGE = "/images/glas/2er-set-weinglas-ringe-personalisiert-699d1e.jpg";
const DEFAULT_COASTER_IMAGE = "/images/untersetzer/Untersetzer-mit-Gravur-Kork-mit-Spruch-Mama-braucht-Kaffee.jpg";

export type CartItem = {
  id: string;
  lineType: "product" | "custom-design";
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  previewImage?: string;
  subtitle?: string;
  designJson?: CoasterDesignDocument;
};

function isLocalProjectImage(image?: string): image is string {
  return typeof image === "string" && image.startsWith("/images/");
}

function getCartFallbackImage(item: Pick<CartItem, "lineType" | "productId" | "name">): string {
  if (item.lineType === "custom-design") {
    return CUSTOM_COASTER_PRODUCT.image;
  }

  const mappedProductImage = getProductById(item.productId)?.image;
  if (isLocalProjectImage(mappedProductImage)) {
    return mappedProductImage;
  }

  const itemHint = `${item.productId} ${item.name}`.toLowerCase();
  return itemHint.includes("gu-") || itemHint.includes("untersetzer") ? DEFAULT_COASTER_IMAGE : DEFAULT_GLASS_IMAGE;
}

export function getSafeCartItemImage(item: Pick<CartItem, "image" | "lineType" | "productId" | "name">): string {
  return isLocalProjectImage(item.image) ? item.image : getCartFallbackImage(item);
}

export function sanitizeCartItem(item: CartItem): CartItem {
  return {
    ...item,
    image: getSafeCartItemImage(item)
  };
}

export function sanitizeCartItems(items: CartItem[]): CartItem[] {
  return items.map(sanitizeCartItem);
}

export function createCartItemFromProduct(product: Product): CartItem {
  return sanitizeCartItem({
    id: `product-${product.id}`,
    lineType: "product",
    productId: product.id,
    name: product.name,
    price: product.price,
    quantity: 1,
    image: product.image,
    subtitle: `${product.collection} · ${product.glassType}`
  });
}

export function calculateCartCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function calculateCartSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
