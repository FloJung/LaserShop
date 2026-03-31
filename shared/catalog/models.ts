import type {
  CHECKOUT_SOURCES,
  OPTION_PRICING_MODES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PRODUCT_OPTION_TYPES,
  PRODUCT_STATUSES,
  PRODUCTION_STATUSES,
  STOCK_MODES,
  UPLOAD_REVIEW_STATUSES,
  USER_ROLES
} from "./constants";

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export type StockMode = (typeof STOCK_MODES)[number];
export type ProductOptionType = (typeof PRODUCT_OPTION_TYPES)[number];
export type OptionPricingMode = (typeof OPTION_PRICING_MODES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];
export type UploadReviewStatus = (typeof UPLOAD_REVIEW_STATUSES)[number];
export type UserRole = (typeof USER_ROLES)[number];
export type CheckoutSource = (typeof CHECKOUT_SOURCES)[number];

export type CurrencyCode = "EUR";
export type TimestampLike = string;

export type ProductDocument = {
  title: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  category: string;
  shopCategory: string;
  glassType: string;
  collection: string;
  collectionSlug: string;
  designer: string;
  occasion: string;
  badge?: string;
  featured: boolean;
  care: string;
  benefits: string[];
  rating: number;
  reviews: number;
  status: ProductStatus;
  isPersonalizable: boolean;
  defaultVariantId?: string;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

export type ProductVariantDocument = {
  sku: string;
  name: string;
  priceCents: number;
  compareAtPriceCents?: number;
  currency: CurrencyCode;
  stockMode: StockMode;
  stockQuantity?: number;
  isActive: boolean;
  weightGrams?: number;
  productionTimeDays: number;
  sortOrder: number;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

export type ProductImageDocument = {
  storagePath: string;
  url: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: TimestampLike;
};

export type ProductOptionDocument = {
  name: string;
  code: string;
  type: ProductOptionType;
  isRequired: boolean;
  helpText?: string;
  placeholder?: string;
  maxLength?: number;
  priceModifierCents?: number;
  pricingMode: OptionPricingMode;
  sortOrder: number;
  isActive: boolean;
  acceptedMimeTypes?: string[];
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

export type ProductOptionValueDocument = {
  label: string;
  value: string;
  sortOrder: number;
  priceModifierCents?: number;
  isActive: boolean;
};

export type CustomerAddress = {
  firstName: string;
  lastName: string;
  company?: string;
  line1: string;
  line2?: string;
  postalCode: string;
  city: string;
  countryCode: string;
  phone?: string;
};

export type CheckoutCustomerInput = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
};

export type UploadReferenceInput = {
  uploadId: string;
  originalFilename?: string;
};

export type CartConfigurationInputValue = string | boolean | UploadReferenceInput;

export type CartConfigurationInput = {
  optionId: string;
  value: CartConfigurationInputValue;
};

export type CheckoutCartLineInput = {
  lineId: string;
  productId: string;
  variantId: string;
  quantity: number;
  configurations?: CartConfigurationInput[];
  designPreviewUrl?: string;
  customData?: Record<string, unknown>;
};

export type CheckoutValidationRequest = {
  source: CheckoutSource;
  currency: CurrencyCode;
  customer: CheckoutCustomerInput;
  shippingAddress: CustomerAddress;
  billingAddress?: CustomerAddress;
  notesCustomer?: string;
  lines: CheckoutCartLineInput[];
};

export type ValidatedCartConfiguration = {
  optionId: string;
  optionCode: string;
  optionName: string;
  optionType: ProductOptionType;
  value: CartConfigurationInputValue;
  renderedValue: string;
  priceModifierCents: number;
  uploadId?: string;
};

export type ValidatedCartLine = {
  lineId: string;
  productId: string;
  variantId: string;
  quantity: number;
  sku: string;
  productTitle: string;
  variantName: string;
  unitPriceCents: number;
  lineSubtotalCents: number;
  lineTotalCents: number;
  isPersonalized: boolean;
  productionTimeDays: number;
  configurations: ValidatedCartConfiguration[];
  designPreviewUrl?: string;
  customData?: Record<string, unknown>;
};

export type OrderTotals = {
  subtotalCents: number;
  shippingTotalCents: number;
  taxTotalCents: number;
  discountTotalCents: number;
  grandTotalCents: number;
};

export type ValidatedCheckout = {
  source: CheckoutSource;
  currency: CurrencyCode;
  customer: CheckoutCustomerInput;
  shippingAddress: CustomerAddress;
  billingAddress?: CustomerAddress;
  notesCustomer?: string;
  lines: ValidatedCartLine[];
  totals: OrderTotals;
  maxProductionTimeDays: number;
};

export type OrderDocument = {
  orderNumber: string;
  ownerUid?: string;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhone?: string;
  source: CheckoutSource;
  currency: CurrencyCode;
  subtotalCents: number;
  shippingTotalCents: number;
  taxTotalCents: number;
  discountTotalCents: number;
  grandTotalCents: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  productionStatus: ProductionStatus;
  productionDueDate?: TimestampLike;
  shippingAddress: CustomerAddress;
  billingAddress?: CustomerAddress;
  notesCustomer?: string;
  notesInternal?: string;
  itemCount: number;
  maxProductionTimeDays: number;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

export type OrderItemDocument = {
  productId?: string;
  variantId?: string;
  skuSnapshot: string;
  productTitleSnapshot: string;
  variantNameSnapshot: string;
  unitPriceSnapshotCents: number;
  quantity: number;
  lineSubtotalCents: number;
  lineTotalCents: number;
  isPersonalized: boolean;
  designPreviewUrl?: string;
  customData?: Record<string, unknown>;
  createdAt: TimestampLike;
};

export type OrderItemConfigurationDocument = {
  optionId?: string;
  optionCodeSnapshot: string;
  optionNameSnapshot: string;
  optionTypeSnapshot: ProductOptionType;
  value: CartConfigurationInputValue;
  renderedValue: string;
  priceModifierSnapshotCents: number;
  uploadId?: string;
  createdAt: TimestampLike;
};

export type UploadDocument = {
  ownerUid?: string;
  createdByRole: "guest" | UserRole;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  linkedOrderId?: string;
  linkedOrderItemId?: string;
  linkedOptionId?: string;
  reviewStatus: UploadReviewStatus;
  allowGuestUpload: boolean;
  expiresAt?: TimestampLike;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

export type CustomerProfileDocument = {
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

export type OrderStatusUpdateRequest = {
  orderId: string;
  paymentStatus?: PaymentStatus;
  orderStatus?: OrderStatus;
  productionStatus?: ProductionStatus;
  notesInternal?: string;
};
