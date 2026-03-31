import type { CoasterDesignDocument } from "@/lib/design-tool";
import { products } from "@/lib/data/products";
import type { Product } from "@/lib/types";
import type {
  CartConfigurationInput,
  CheckoutCustomerInput,
  CheckoutValidationRequest,
  CustomerAddress
} from "@/shared/catalog";

export const CUSTOM_COASTER_PRODUCT = {
  id: "gu-custom",
  variantId: "gu-custom-default",
  name: "Glasuntersaetzer Custom",
  price: 24.9,
  image: "/images/untersetzer/Untersetzer-mit-Gravur-Kork-mit-Spruch-Mama-braucht-Kaffee.jpg"
} as const;

const DEFAULT_GLASS_IMAGE = "/images/glas/2er-set-weinglas-ringe-personalisiert-699d1e.jpg";
const DEFAULT_COASTER_IMAGE = "/images/untersetzer/Untersetzer-mit-Gravur-Kork-mit-Spruch-Mama-braucht-Kaffee.jpg";

export type CartItem = {
  id: string;
  lineType: "product" | "custom-design";
  productId: string;
  variantId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  previewImage?: string;
  subtitle?: string;
  configurations?: CartConfigurationInput[];
  designJson?: CoasterDesignDocument;
};

function isLocalProjectImage(image?: string): image is string {
  return typeof image === "string" && image.startsWith("/images/");
}

function getCartFallbackImage(item: Pick<CartItem, "lineType" | "productId" | "name">): string {
  if (item.lineType === "custom-design") {
    return CUSTOM_COASTER_PRODUCT.image;
  }

  const mappedProductImage = products.find((product) => product.id === item.productId)?.image;
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
    variantId: item.variantId || `${item.productId}-default`,
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
    variantId: product.defaultVariantId ?? `${product.id}-default`,
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

export function buildCheckoutRequest(input: {
  items: CartItem[];
  customer: CheckoutCustomerInput;
  shippingAddress: CustomerAddress;
  billingAddress?: CustomerAddress;
  notesCustomer?: string;
}): CheckoutValidationRequest {
  return {
    source: "web",
    currency: "EUR",
    customer: input.customer,
    shippingAddress: input.shippingAddress,
    billingAddress: input.billingAddress,
    notesCustomer: input.notesCustomer,
    lines: input.items.map((item) => ({
      lineId: item.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      configurations: item.configurations,
      designPreviewUrl: item.previewImage,
      customData: item.designJson ? { designDocument: item.designJson } : undefined
    }))
  };
}
