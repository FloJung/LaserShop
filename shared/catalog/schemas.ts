import { z } from "zod";
import {
  CHECKOUT_SOURCES,
  MAX_CART_LINE_QUANTITY,
  MAX_CUSTOMER_NOTE_LENGTH,
  MAX_TEXTAREA_OPTION_LENGTH,
  MAX_TEXT_OPTION_LENGTH,
  OPTION_PRICING_MODES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PRODUCT_IMAGE_SYNC_STATUSES,
  PRODUCT_OPTION_TYPES,
  PRODUCT_SHOPIFY_SYNC_STATUSES,
  PRODUCT_TAXONOMY_KINDS,
  PRODUCT_STATUSES,
  PRODUCTION_STATUSES,
  STOCK_MODES,
  UPLOAD_REVIEW_STATUSES,
  USER_ROLES
} from "./constants";

const emailSchema = z.email();

export const checkoutCustomerSchema = z.object({
  email: emailSchema,
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(40).optional()
});

export const addressSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  company: z.string().trim().max(120).optional(),
  line1: z.string().trim().min(1).max(120),
  line2: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().min(1).max(20),
  city: z.string().trim().min(1).max(120),
  countryCode: z.string().trim().length(2).toUpperCase(),
  phone: z.string().trim().max(40).optional()
});

export const uploadReferenceInputSchema = z.object({
  uploadId: z.string().trim().min(8).max(128),
  originalFilename: z.string().trim().max(255).optional()
});

export const cartConfigurationInputValueSchema = z.union([z.string(), z.boolean(), uploadReferenceInputSchema]);

export const cartConfigurationInputSchema = z.object({
  optionId: z.string().trim().min(1).max(120),
  value: cartConfigurationInputValueSchema
});

export const checkoutCartLineInputSchema = z.object({
  lineId: z.string().trim().min(1).max(120),
  productId: z.string().trim().min(1).max(120),
  variantId: z.string().trim().min(1).max(120),
  quantity: z.number().int().min(1).max(MAX_CART_LINE_QUANTITY),
  configurations: z.array(cartConfigurationInputSchema).max(25).optional(),
  designPreviewUrl: z.url().max(2_000).optional(),
  customData: z.record(z.string(), z.unknown()).optional()
});

export const checkoutValidationRequestSchema = z.object({
  source: z.enum(CHECKOUT_SOURCES),
  currency: z.literal("EUR"),
  customer: checkoutCustomerSchema,
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  notesCustomer: z.string().trim().max(MAX_CUSTOMER_NOTE_LENGTH).optional(),
  lines: z.array(checkoutCartLineInputSchema).min(1).max(50)
});

export const productStatusSchema = z.enum(PRODUCT_STATUSES);
export const stockModeSchema = z.enum(STOCK_MODES);
export const productOptionTypeSchema = z.enum(PRODUCT_OPTION_TYPES);
export const optionPricingModeSchema = z.enum(OPTION_PRICING_MODES);
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export const productImageSyncStatusSchema = z.enum(PRODUCT_IMAGE_SYNC_STATUSES);
export const productShopifySyncStatusSchema = z.enum(PRODUCT_SHOPIFY_SYNC_STATUSES);
export const productTaxonomyKindSchema = z.enum(PRODUCT_TAXONOMY_KINDS);
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export const productionStatusSchema = z.enum(PRODUCTION_STATUSES);
export const uploadReviewStatusSchema = z.enum(UPLOAD_REVIEW_STATUSES);
export const userRoleSchema = z.enum(USER_ROLES);

export const productDocumentSchema = z.object({
  title: z.string().trim().min(1).max(180),
  slug: z.string().trim().min(1).max(180),
  shortDescription: z.string().trim().min(1).max(300),
  longDescription: z.string().trim().min(1).max(5_000),
  category: z.string().trim().max(80),
  categoryId: z.string().trim().max(120).optional(),
  shopCategory: z.string().trim().max(80),
  shopCategoryId: z.string().trim().max(120).optional(),
  glassType: z.string().trim().max(80),
  glassTypeId: z.string().trim().max(120).optional(),
  collection: z.string().trim().max(120),
  collectionId: z.string().trim().max(120).optional(),
  collectionSlug: z.string().trim().max(80),
  designer: z.string().trim().max(120),
  designerId: z.string().trim().max(120).optional(),
  occasion: z.string().trim().max(80),
  occasionId: z.string().trim().max(120).optional(),
  badge: z.string().trim().max(80).optional(),
  featured: z.boolean(),
  care: z.string().trim().min(1).max(500),
  benefits: z.array(z.string().trim().min(1).max(120)).max(12),
  rating: z.number().min(0).max(5),
  reviews: z.number().int().min(0),
  status: productStatusSchema,
  shopifySyncStatus: productShopifySyncStatusSchema.optional(),
  shopifySyncError: z.string().trim().max(500).optional(),
  shopifyLastSyncedAt: z.string().optional(),
  shopifyLastAttemptedAt: z.string().optional(),
  isPersonalizable: z.boolean(),
  defaultVariantId: z.string().trim().max(120).optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const productTaxonomyDocumentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120),
  description: z.string().trim().max(400).optional(),
  sortOrder: z.number().int().min(0).max(5_000),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const productVariantDocumentSchema = z.object({
  sku: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(180),
  priceCents: z.number().int().nonnegative(),
  compareAtPriceCents: z.number().int().positive().optional(),
  currency: z.literal("EUR"),
  stockMode: stockModeSchema,
  stockQuantity: z.number().int().nonnegative().optional(),
  isActive: z.boolean(),
  weightGrams: z.number().int().nonnegative().optional(),
  productionTimeDays: z.number().int().min(0).max(90),
  sortOrder: z.number().int().min(0).max(1_000),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const productImageDocumentSchema = z
  .object({
  productId: z.string().trim().min(1).max(120),
  originalFilename: z.string().trim().max(255).optional(),
  mimeType: z.string().trim().max(120).optional(),
  fileSize: z.number().int().positive().optional(),
  storagePath: z.string().trim().min(1).max(500),
  url: z.string().trim().min(1).max(2_000).optional(),
  publicUrl: z.string().trim().min(1).max(2_000).optional(),
  altText: z.string().trim().min(1).max(180),
  sortOrder: z.number().int().min(0).max(1_000),
  isPrimary: z.boolean(),
  syncStatus: productImageSyncStatusSchema.optional(),
  syncError: z.string().trim().max(500).optional(),
  shopifyImageId: z.string().trim().max(120).optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional()
})
  .refine((image) => Boolean(image.publicUrl ?? image.url), {
    message: "Product image requires either publicUrl or url."
  })
  ;

export const productOptionDocumentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(1).max(120),
  type: productOptionTypeSchema,
  isRequired: z.boolean(),
  helpText: z.string().trim().max(500).optional(),
  placeholder: z.string().trim().max(120).optional(),
  maxLength: z.number().int().positive().max(MAX_TEXTAREA_OPTION_LENGTH).optional(),
  priceModifierCents: z.number().int().optional(),
  pricingMode: optionPricingModeSchema,
  sortOrder: z.number().int().min(0).max(1_000),
  isActive: z.boolean(),
  acceptedMimeTypes: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const productOptionValueDocumentSchema = z.object({
  label: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0).max(1_000),
  priceModifierCents: z.number().int().optional(),
  isActive: z.boolean()
});

export const editableProductVariantSchema = productVariantDocumentSchema.extend({
  id: z.string().trim().min(1).max(120)
});

export const editableProductImageSchema = productImageDocumentSchema.safeExtend({
  id: z.string().trim().min(1).max(120)
});

export const editableProductOptionValueSchema = productOptionValueDocumentSchema.extend({
  id: z.string().trim().min(1).max(120)
});

export const editableProductOptionSchema = productOptionDocumentSchema.extend({
  id: z.string().trim().min(1).max(120),
  values: z.array(editableProductOptionValueSchema).max(50)
});

export const editableProductPayloadSchema = productDocumentSchema
  .omit({
    createdAt: true,
    updatedAt: true,
    defaultVariantId: true,
    shopifySyncStatus: true,
    shopifySyncError: true,
    shopifyLastSyncedAt: true,
    shopifyLastAttemptedAt: true
  })
  .extend({
    defaultVariantId: z.string().trim().max(120).optional(),
    benefits: z.array(z.string().trim().min(1).max(120)).min(1).max(12),
    variants: z.array(editableProductVariantSchema).min(1).max(50),
    images: z.array(editableProductImageSchema).max(50),
    options: z.array(editableProductOptionSchema).max(50)
  });

export const uploadReservationRequestSchema = z.object({
  originalFilename: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  fileSize: z.number().int().positive()
});

export const uploadDocumentSchema = z.object({
  ownerUid: z.string().trim().max(128).optional(),
  createdByRole: z.union([z.literal("guest"), userRoleSchema]),
  storagePath: z.string().trim().min(1).max(500),
  originalFilename: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  fileSize: z.number().int().positive(),
  linkedOrderId: z.string().trim().max(120).optional(),
  linkedOrderItemId: z.string().trim().max(120).optional(),
  linkedOptionId: z.string().trim().max(120).optional(),
  reviewStatus: uploadReviewStatusSchema,
  allowGuestUpload: z.boolean(),
  expiresAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const orderDocumentSchema = z.object({
  orderNumber: z.string().trim().min(1).max(120),
  ownerUid: z.string().trim().max(128).optional(),
  customerEmail: emailSchema,
  customerFirstName: z.string().trim().min(1).max(80),
  customerLastName: z.string().trim().min(1).max(80),
  customerPhone: z.string().trim().max(40).optional(),
  source: z.enum(CHECKOUT_SOURCES),
  currency: z.literal("EUR"),
  subtotalCents: z.number().int().nonnegative(),
  shippingTotalCents: z.number().int().nonnegative(),
  taxTotalCents: z.number().int().nonnegative(),
  discountTotalCents: z.number().int().nonnegative(),
  grandTotalCents: z.number().int().nonnegative(),
  paymentStatus: paymentStatusSchema,
  orderStatus: orderStatusSchema,
  productionStatus: productionStatusSchema,
  productionDueDate: z.string().optional(),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  notesCustomer: z.string().trim().max(MAX_CUSTOMER_NOTE_LENGTH).optional(),
  notesInternal: z.string().trim().max(MAX_CUSTOMER_NOTE_LENGTH).optional(),
  itemCount: z.number().int().nonnegative(),
  maxProductionTimeDays: z.number().int().min(0).max(365),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const orderItemDocumentSchema = z.object({
  productId: z.string().trim().max(120).optional(),
  variantId: z.string().trim().max(120).optional(),
  skuSnapshot: z.string().trim().min(1).max(120),
  productTitleSnapshot: z.string().trim().min(1).max(180),
  variantNameSnapshot: z.string().trim().min(1).max(180),
  unitPriceSnapshotCents: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  lineSubtotalCents: z.number().int().nonnegative(),
  lineTotalCents: z.number().int().nonnegative(),
  isPersonalized: z.boolean(),
  designPreviewUrl: z.string().trim().max(2_000).optional(),
  customData: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string()
});

export const orderItemConfigurationDocumentSchema = z.object({
  optionId: z.string().trim().max(120).optional(),
  optionCodeSnapshot: z.string().trim().min(1).max(120),
  optionNameSnapshot: z.string().trim().min(1).max(120),
  optionTypeSnapshot: productOptionTypeSchema,
  value: cartConfigurationInputValueSchema,
  renderedValue: z.string().trim().min(1).max(2_000),
  priceModifierSnapshotCents: z.number().int(),
  uploadId: z.string().trim().max(120).optional(),
  createdAt: z.string()
});

export const orderStatusUpdateRequestSchema = z.object({
  orderId: z.string().trim().min(1).max(120),
  paymentStatus: paymentStatusSchema.optional(),
  orderStatus: orderStatusSchema.optional(),
  productionStatus: productionStatusSchema.optional(),
  notesInternal: z.string().trim().max(MAX_CUSTOMER_NOTE_LENGTH).optional()
});

export const linkUploadRequestSchema = z.object({
  orderId: z.string().trim().min(1).max(120),
  itemId: z.string().trim().min(1).max(120),
  optionId: z.string().trim().min(1).max(120),
  uploadId: z.string().trim().min(1).max(120)
});

export const textOptionSchema = z.string().trim().min(1).max(MAX_TEXT_OPTION_LENGTH);
export const textareaOptionSchema = z.string().trim().min(1).max(MAX_TEXTAREA_OPTION_LENGTH);
