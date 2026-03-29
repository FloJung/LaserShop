import type { Product } from "@/lib/types";
import type { CoasterDesignDocument } from "@/lib/design-tool";

export const CUSTOM_COASTER_PRODUCT = {
  id: "gu-custom",
  name: "Glasuntersaetzer Custom",
  price: 24.9,
  image:
    "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1000&q=80"
} as const;

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

export function createCartItemFromProduct(product: Product): CartItem {
  return {
    id: `product-${product.id}`,
    lineType: "product",
    productId: product.id,
    name: product.name,
    price: product.price,
    quantity: 1,
    image: product.image,
    subtitle: `${product.collection} · ${product.glassType}`
  };
}

export function calculateCartCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function calculateCartSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
