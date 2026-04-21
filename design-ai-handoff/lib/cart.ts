import type { CoasterDesignDocument } from "@/lib/design-tool";
import type { Product } from "@/lib/types";
import type {
  CartItemPersonalization,
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
  imageUrl: string;
  image?: string;
  previewImage?: string;
  subtitle?: string;
  configurations?: CartItemPersonalization[];
  designJson?: CoasterDesignDocument;
};

type CartItemInput = Omit<CartItem, "imageUrl"> & {
  imageUrl?: string;
};

function createCartItemId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeCartConfigurations(configurations?: CartItemPersonalization[]) {
  if (!configurations || configurations.length === 0) {
    return undefined;
  }

  return [...configurations]
    .map((configuration) => ({
      ...configuration,
      optionId: configuration.optionId.trim()
    }))
    .filter((configuration) => configuration.optionId.length > 0);
}

function serializeConfigurationValue(value: CartItemPersonalization["value"]) {
  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  return {
    uploadId: value.uploadId,
    originalFilename: value.originalFilename ?? ""
  };
}

export function getCartItemMergeKey(
  item: Pick<CartItem, "lineType" | "productId" | "variantId" | "configurations" | "designJson">
) {
  return JSON.stringify({
    lineType: item.lineType,
    productId: item.productId,
    variantId: item.variantId,
    configurations: (item.configurations ?? []).map((configuration) => ({
      optionId: configuration.optionId,
      value: serializeConfigurationValue(configuration.value)
    })),
    customDesign: item.designJson
      ? {
          productId: item.designJson.productId,
          updatedAt: item.designJson.updatedAt
        }
      : undefined
  });
}

function summarizeDesignDocument(design: CoasterDesignDocument) {
  return {
    designVersion: design.version,
    designProductId: design.productId,
    designUpdatedAt: design.updatedAt,
    elementCount: design.elements.length,
    elementTypes: design.elements.map((element) => element.type),
    hasUploads: design.elements.some((element) => element.type === "upload")
  } satisfies Record<string, unknown>;
}

function getCheckoutPreviewUrl(previewImage?: string) {
  if (!previewImage || previewImage.startsWith("data:")) {
    return undefined;
  }

  return previewImage;
}

function isCartImageUrl(image?: string): image is string {
  if (typeof image !== "string") {
    return false;
  }

  return image.startsWith("/") || image.startsWith("https://") || image.startsWith("http://");
}

function getCartFallbackImage(item: Pick<CartItem, "lineType">): string {
  if (item.lineType === "custom-design") {
    return CUSTOM_COASTER_PRODUCT.image;
  }

  return DEFAULT_GLASS_IMAGE;
}

export function getSafeCartItemImage(item: Pick<CartItemInput, "imageUrl" | "image" | "lineType" | "productId" | "name">): string {
  const storedImage = item.imageUrl ?? item.image;
  return isCartImageUrl(storedImage) ? storedImage : getCartFallbackImage(item);
}

export function sanitizeCartItem(item: CartItemInput): CartItem {
  const imageUrl = getSafeCartItemImage(item);

  return {
    ...item,
    variantId: item.variantId || `${item.productId}-default`,
    imageUrl,
    image: imageUrl,
    configurations: normalizeCartConfigurations(item.configurations)
  };
}

export function sanitizeCartItems(items: CartItemInput[]): CartItem[] {
  return items.map(sanitizeCartItem);
}

export function attachPersonalizationToCartItem(item: CartItem, configurations?: CartItemPersonalization[]) {
  return sanitizeCartItem({
    ...item,
    configurations: normalizeCartConfigurations(configurations)
  });
}

export function createCartItemFromProduct(product: Product, configurations?: CartItemPersonalization[]): CartItem {
  return sanitizeCartItem({
    id: createCartItemId(`product-${product.id}`),
    lineType: "product",
    productId: product.id,
    variantId: product.defaultVariantId ?? `${product.id}-default`,
    name: product.name,
    price: product.price,
    quantity: 1,
    imageUrl: product.primaryImageUrl ?? product.image,
    configurations: normalizeCartConfigurations(configurations),
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
      configurations: item.configurations?.map(({ optionId, value }) => ({
        optionId,
        value
      })),
      designPreviewUrl: getCheckoutPreviewUrl(item.previewImage),
      customData: item.designJson ? summarizeDesignDocument(item.designJson) : undefined
    }))
  };
}
