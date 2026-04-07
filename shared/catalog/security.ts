import type { Firestore } from "firebase-admin/firestore";
import { z } from "zod";
import { MAX_CART_LINE_QUANTITY, SHOP_PRICING_CONFIG } from "./constants";
import type {
  CartConfigurationInput,
  CartConfigurationInputValue,
  OrderTotals,
  UploadDocument,
  ValidatedCartConfiguration,
  ValidatedCartLine,
  ValidatedCheckout
} from "./models";
import { buildOrderTotals } from "./pricing";
import {
  cartConfigurationInputSchema,
  checkoutValidationRequestSchema,
  productDocumentSchema,
  productOptionDocumentSchema,
  productOptionValueDocumentSchema,
  productVariantDocumentSchema,
  textOptionSchema,
  textareaOptionSchema,
  uploadDocumentSchema
} from "./schemas";

const MAX_CHECKOUT_PREVIEW_IMAGE_LENGTH = 2_500_000;
export const SVG_UPLOAD_ERROR_MESSAGE = "SVG uploads are not allowed for security reasons.";

const shopifyCheckoutLineInputSchema = z.object({
  lineId: z.string().trim().min(1).max(120).optional(),
  lineType: z.enum(["product", "custom-design"]).optional(),
  productId: z.string().trim().min(1).max(120),
  variantId: z.string().trim().min(1).max(120),
  quantity: z.number().int().min(1).max(MAX_CART_LINE_QUANTITY),
  configurations: z.array(cartConfigurationInputSchema).max(25).optional(),
  previewImage: z.string().max(MAX_CHECKOUT_PREVIEW_IMAGE_LENGTH).optional()
});

const shopifyCheckoutPayloadSchema = z.object({
  lines: z.array(shopifyCheckoutLineInputSchema).min(1).max(50)
});

type ProductContext = {
  productId: string;
  productDoc: ReturnType<typeof productDocumentSchema.parse>;
  variantId: string;
  variantDoc: ReturnType<typeof productVariantDocumentSchema.parse>;
  options: Array<{
    id: string;
    doc: ReturnType<typeof productOptionDocumentSchema.parse>;
    values: Array<{ id: string; doc: ReturnType<typeof productOptionValueDocumentSchema.parse> }>;
  }>;
};

type StorageFileLike = {
  exists(): Promise<[boolean]>;
  getMetadata(): Promise<[Record<string, unknown>, ...unknown[]]>;
  download(options?: { start?: number; end?: number }): Promise<[Buffer, ...unknown[]]>;
};

type StorageBucketLike = {
  file(path: string): StorageFileLike;
};

type ValidationServices = {
  db: Firestore;
  bucket: StorageBucketLike;
};

type CheckoutLinesValidationInput = {
  currency: "EUR";
  lines: Array<{
    lineId: string;
    productId: string;
    variantId: string;
    quantity: number;
    configurations?: CartConfigurationInput[];
    designPreviewUrl?: string;
    customData?: Record<string, unknown>;
  }>;
};

export type ShopifyCheckoutLineInput = z.infer<typeof shopifyCheckoutLineInputSchema>;

export type ValidatedShopifyCheckoutPayload = {
  currency: "EUR";
  totals: OrderTotals;
  maxProductionTimeDays: number;
  lines: Array<
    ShopifyCheckoutLineInput & {
      lineId: string;
      lineType: "product" | "custom-design";
      validated: ValidatedCartLine;
    }
  >;
};

export class CheckoutSecurityError extends Error {
  readonly code: "invalid-argument" | "failed-precondition";

  constructor(code: "invalid-argument" | "failed-precondition", message: string) {
    super(message);
    this.name = "CheckoutSecurityError";
    this.code = code;
  }
}

function throwSecurityError(code: CheckoutSecurityError["code"], message: string): never {
  throw new CheckoutSecurityError(code, message);
}

function normalizeMimeType(value: string | undefined) {
  return value?.split(";")[0].trim().toLowerCase();
}

export function isSvgMimeType(value: string | undefined) {
  return normalizeMimeType(value) === "image/svg+xml";
}

export function assertSvgUploadIsAllowed(
  mimeType: string | undefined,
  code: CheckoutSecurityError["code"] = "invalid-argument"
) {
  if (isSvgMimeType(mimeType)) {
    throw new CheckoutSecurityError(code, SVG_UPLOAD_ERROR_MESSAGE);
  }
}

export function sanitizeAcceptedUploadMimeTypes(mimeTypes?: string[]) {
  if (!mimeTypes) {
    return undefined;
  }

  return mimeTypes.filter((mimeType) => !isSvgMimeType(mimeType));
}

async function sniffStoredMimeType(file: StorageFileLike, declaredMimeType: string) {
  const normalizedDeclaredMimeType = normalizeMimeType(declaredMimeType);
  if (!normalizedDeclaredMimeType) {
    return null;
  }

  const [buffer] = await file.download({ start: 0, end: 511 });

  if (normalizedDeclaredMimeType === "image/png") {
    return buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
      ? "image/png"
      : null;
  }

  if (normalizedDeclaredMimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
      ? "image/jpeg"
      : null;
  }

  if (normalizedDeclaredMimeType === "image/webp") {
    return buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
      ? "image/webp"
      : null;
  }

  return null;
}

async function assertUploadStorageConsistency(uploadDoc: UploadDocument, services: ValidationServices) {
  // SVG stays blocked even for legacy reservations or reused upload references.
  assertSvgUploadIsAllowed(uploadDoc.mimeType, "failed-precondition");

  const sourceFile = services.bucket.file(uploadDoc.storagePath);
  const [exists] = await sourceFile.exists();
  if (!exists) {
    throwSecurityError("failed-precondition", `Upload file ${uploadDoc.storagePath} does not exist in storage.`);
  }

  const [metadata] = await sourceFile.getMetadata();
  const storedMimeType = normalizeMimeType(
    typeof metadata.contentType === "string" ? metadata.contentType : undefined
  );
  const reservedMimeType = normalizeMimeType(uploadDoc.mimeType);

  if (!storedMimeType || !reservedMimeType || storedMimeType !== reservedMimeType) {
    throwSecurityError(
      "failed-precondition",
      `Upload ${uploadDoc.originalFilename} has inconsistent content type metadata.`
    );
  }

  const storedSize = Number(typeof metadata.size === "string" || typeof metadata.size === "number" ? metadata.size : NaN);
  if (!Number.isFinite(storedSize) || storedSize !== uploadDoc.fileSize) {
    throwSecurityError("failed-precondition", `Upload ${uploadDoc.originalFilename} has inconsistent file size metadata.`);
  }

  const sniffedMimeType = await sniffStoredMimeType(sourceFile, reservedMimeType);
  if (sniffedMimeType && sniffedMimeType !== reservedMimeType) {
    throwSecurityError("failed-precondition", `Upload ${uploadDoc.originalFilename} failed server-side MIME validation.`);
  }
}

function ensureStringValue(value: CartConfigurationInputValue, optionName: string) {
  if (typeof value !== "string") {
    throwSecurityError("invalid-argument", `Option ${optionName} requires a string value.`);
  }

  return value;
}

function ensureBooleanValue(value: CartConfigurationInputValue, optionName: string) {
  if (typeof value !== "boolean") {
    throwSecurityError("invalid-argument", `Option ${optionName} requires a boolean value.`);
  }

  return value;
}

function ensureUploadValue(value: CartConfigurationInputValue, optionName: string) {
  if (!value || typeof value !== "object" || !("uploadId" in value)) {
    throwSecurityError("invalid-argument", `Option ${optionName} requires an upload reference.`);
  }

  return value;
}

async function getProductContext(
  productId: string,
  variantId: string,
  services: ValidationServices,
  cache: Map<string, Promise<ProductContext>>
) {
  const cacheKey = `${productId}:${variantId}`;
  if (!cache.has(cacheKey)) {
    cache.set(
      cacheKey,
      (async () => {
        const productRef = services.db.collection("products").doc(productId);
        const [productSnap, variantSnap, optionSnap] = await Promise.all([
          productRef.get(),
          productRef.collection("variants").doc(variantId).get(),
          productRef.collection("options").get()
        ]);

        if (!productSnap.exists) {
          throwSecurityError("invalid-argument", `Unknown product: ${productId}`);
        }

        if (!variantSnap.exists) {
          throwSecurityError("invalid-argument", `Unknown variant for product ${productId}: ${variantId}`);
        }

        const productDoc = productDocumentSchema.parse(productSnap.data());
        const variantDoc = productVariantDocumentSchema.parse(variantSnap.data());

        if (productDoc.status !== "active") {
          throwSecurityError("failed-precondition", `Product ${productId} is not active.`);
        }

        if (!variantDoc.isActive) {
          throwSecurityError("failed-precondition", `Variant ${variantId} is not active.`);
        }

        if (variantDoc.stockMode === "tracked" && typeof variantDoc.stockQuantity === "number" && variantDoc.stockQuantity <= 0) {
          throwSecurityError("failed-precondition", `Variant ${variantId} is out of stock.`);
        }

        const options = await Promise.all(
          optionSnap.docs.map(async (optionDocSnap) => {
            const doc = productOptionDocumentSchema.parse(optionDocSnap.data());
            const valuesSnap = await optionDocSnap.ref.collection("values").get();
            return {
              id: optionDocSnap.id,
              doc,
              values: valuesSnap.docs.map((valueDocSnap) => ({
                id: valueDocSnap.id,
                doc: productOptionValueDocumentSchema.parse(valueDocSnap.data())
              }))
            };
          })
        );

        return {
          productId,
          productDoc,
          variantId,
          variantDoc,
          options: options.filter((option) => option.doc.isActive).sort((left, right) => left.doc.sortOrder - right.doc.sortOrder)
        } satisfies ProductContext;
      })()
    );
  }

  return cache.get(cacheKey)!;
}

async function getUploadDocument(
  uploadId: string,
  services: ValidationServices,
  uploadCache: Map<string, Promise<UploadDocument>>
) {
  if (!uploadCache.has(uploadId)) {
    uploadCache.set(
      uploadId,
      (async () => {
        const uploadSnap = await services.db.collection("uploads").doc(uploadId).get();
        if (!uploadSnap.exists) {
          throwSecurityError("invalid-argument", `Unknown upload reference: ${uploadId}`);
        }

        const uploadDoc = uploadDocumentSchema.parse(uploadSnap.data());
        await assertUploadStorageConsistency(uploadDoc, services);
        return uploadDoc;
      })()
    );
  }

  return uploadCache.get(uploadId)!;
}

function getTextModifier(baseModifierCents: number, pricingMode: "none" | "fixed" | "per_character", value: string) {
  if (pricingMode === "per_character") {
    return baseModifierCents * value.length;
  }

  if (pricingMode === "fixed") {
    return baseModifierCents;
  }

  return 0;
}

async function validateConfiguration(
  context: ProductContext,
  config: CartConfigurationInput,
  services: ValidationServices,
  uploadCache: Map<string, Promise<UploadDocument>>
) {
  const option = context.options.find((entry) => entry.id === config.optionId);
  if (!option) {
    throwSecurityError("invalid-argument", `Unknown option ${config.optionId} for product ${context.productId}.`);
  }

  const baseModifier = option.doc.priceModifierCents ?? 0;
  const pricingMode = option.doc.pricingMode;

  if (option.doc.type === "text") {
    const value = textOptionSchema.max(option.doc.maxLength ?? 120).parse(ensureStringValue(config.value, option.doc.name));
    return {
      optionId: option.id,
      optionCode: option.doc.code,
      optionName: option.doc.name,
      optionType: option.doc.type,
      value,
      renderedValue: value,
      priceModifierCents: getTextModifier(baseModifier, pricingMode, value)
    } satisfies ValidatedCartConfiguration;
  }

  if (option.doc.type === "textarea") {
    const value = textareaOptionSchema.max(option.doc.maxLength ?? 2000).parse(ensureStringValue(config.value, option.doc.name));
    return {
      optionId: option.id,
      optionCode: option.doc.code,
      optionName: option.doc.name,
      optionType: option.doc.type,
      value,
      renderedValue: value,
      priceModifierCents: getTextModifier(baseModifier, pricingMode, value)
    } satisfies ValidatedCartConfiguration;
  }

  if (option.doc.type === "checkbox") {
    const value = ensureBooleanValue(config.value, option.doc.name);
    return {
      optionId: option.id,
      optionCode: option.doc.code,
      optionName: option.doc.name,
      optionType: option.doc.type,
      value,
      renderedValue: value ? "Ja" : "Nein",
      priceModifierCents: value && pricingMode === "fixed" ? baseModifier : 0
    } satisfies ValidatedCartConfiguration;
  }

  if (option.doc.type === "select") {
    const value = ensureStringValue(config.value, option.doc.name);
    const selectedValue = option.values.find((entry) => entry.doc.isActive && entry.doc.value === value);
    if (!selectedValue) {
      throwSecurityError("invalid-argument", `Invalid value for option ${option.doc.name}.`);
    }

    return {
      optionId: option.id,
      optionCode: option.doc.code,
      optionName: option.doc.name,
      optionType: option.doc.type,
      value,
      renderedValue: selectedValue.doc.label,
      priceModifierCents: (pricingMode === "fixed" ? baseModifier : 0) + (selectedValue.doc.priceModifierCents ?? 0)
    } satisfies ValidatedCartConfiguration;
  }

  const uploadValue = ensureUploadValue(config.value, option.doc.name);
  const uploadDoc = await getUploadDocument(uploadValue.uploadId, services, uploadCache);
  if (uploadDoc.linkedOrderId) {
    throwSecurityError("failed-precondition", `Upload ${uploadValue.uploadId} is already linked to an order.`);
  }

  const acceptedMimeTypes = sanitizeAcceptedUploadMimeTypes(option.doc.acceptedMimeTypes);
  if (acceptedMimeTypes && !acceptedMimeTypes.includes(uploadDoc.mimeType)) {
    throwSecurityError("failed-precondition", `Upload ${uploadValue.uploadId} has an invalid file type.`);
  }

  return {
    optionId: option.id,
    optionCode: option.doc.code,
    optionName: option.doc.name,
    optionType: option.doc.type,
    value: {
      uploadId: uploadValue.uploadId,
      originalFilename: uploadDoc.originalFilename
    },
    renderedValue: uploadDoc.originalFilename,
    priceModifierCents: pricingMode === "fixed" ? baseModifier : 0,
    uploadId: uploadValue.uploadId
  } satisfies ValidatedCartConfiguration;
}

function enforceRequiredOptions(context: ProductContext, seenOptionIds: Set<string>) {
  const missing = context.options
    .filter((option) => option.doc.isRequired)
    .filter((option) => !seenOptionIds.has(option.id))
    .map((option) => option.doc.name);

  if (missing.length > 0) {
    throwSecurityError("invalid-argument", `Missing required options for product ${context.productId}: ${missing.join(", ")}`);
  }
}

async function validateCheckoutLinesCore(input: CheckoutLinesValidationInput, services: ValidationServices) {
  if (input.currency !== SHOP_PRICING_CONFIG.currency) {
    throwSecurityError("invalid-argument", `Unsupported currency ${input.currency}.`);
  }

  const productCache = new Map<string, Promise<ProductContext>>();
  const uploadCache = new Map<string, Promise<UploadDocument>>();
  const lines: ValidatedCartLine[] = [];

  for (const line of input.lines) {
    const context = await getProductContext(line.productId, line.variantId, services, productCache);
    const configMap = new Map((line.configurations ?? []).map((config) => [config.optionId, config]));

    if (configMap.size !== (line.configurations ?? []).length) {
      throwSecurityError("invalid-argument", `Duplicate configuration option detected in line ${line.lineId}.`);
    }

    const configurations: ValidatedCartConfiguration[] = [];
    const seenOptionIds = new Set<string>();

    for (const option of context.options) {
      const providedConfig = configMap.get(option.id);
      if (!providedConfig) {
        continue;
      }

      seenOptionIds.add(option.id);
      configurations.push(await validateConfiguration(context, providedConfig, services, uploadCache));
    }

    if (seenOptionIds.size !== configMap.size) {
      const unknownOptionIds = [...configMap.keys()].filter((optionId) => !seenOptionIds.has(optionId));
      throwSecurityError("invalid-argument", `Unknown options on line ${line.lineId}: ${unknownOptionIds.join(", ")}`);
    }

    enforceRequiredOptions(context, seenOptionIds);

    if (
      context.variantDoc.stockMode === "tracked" &&
      typeof context.variantDoc.stockQuantity === "number" &&
      line.quantity > context.variantDoc.stockQuantity
    ) {
      throwSecurityError(
        "failed-precondition",
        `Requested quantity ${line.quantity} exceeds stock for variant ${context.variantId}.`
      );
    }

    const unitPriceCents = context.variantDoc.priceCents;
    const lineSubtotalCents = unitPriceCents * line.quantity;
    const configurationTotalPerUnit = configurations.reduce((sum, configuration) => sum + configuration.priceModifierCents, 0);
    const lineTotalCents = (unitPriceCents + configurationTotalPerUnit) * line.quantity;

    lines.push({
      lineId: line.lineId,
      productId: line.productId,
      variantId: line.variantId,
      quantity: line.quantity,
      sku: context.variantDoc.sku,
      productTitle: context.productDoc.title,
      productCollection: context.productDoc.collection,
      productGlassType: context.productDoc.glassType,
      variantName: context.variantDoc.name,
      unitPriceCents,
      lineSubtotalCents,
      lineTotalCents,
      isPersonalized: configurations.length > 0 || Boolean(line.customData),
      productionTimeDays: context.variantDoc.productionTimeDays,
      configurations,
      designPreviewUrl: line.designPreviewUrl,
      customData: line.customData
    });
  }

  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const totals = buildOrderTotals({ subtotalCents });

  return {
    currency: input.currency,
    lines,
    totals,
    maxProductionTimeDays: Math.max(...lines.map((line) => line.productionTimeDays), 0)
  };
}

export async function validateCheckoutPayload(input: unknown, services: ValidationServices): Promise<ValidatedCheckout> {
  const request = checkoutValidationRequestSchema.parse(input);
  const validatedLines = await validateCheckoutLinesCore(
    {
      currency: request.currency,
      lines: request.lines
    },
    services
  );

  return {
    source: request.source,
    currency: validatedLines.currency,
    customer: request.customer,
    shippingAddress: request.shippingAddress,
    billingAddress: request.billingAddress,
    notesCustomer: request.notesCustomer,
    lines: validatedLines.lines,
    totals: validatedLines.totals,
    maxProductionTimeDays: validatedLines.maxProductionTimeDays
  };
}

export async function validateShopifyCheckoutPayload(
  input: unknown,
  services: ValidationServices
): Promise<ValidatedShopifyCheckoutPayload> {
  const request = shopifyCheckoutPayloadSchema.parse(input);
  const normalizedLines = request.lines.map((line) => ({
    ...line,
    lineId: line.lineId ?? `${line.productId}:${line.variantId}`,
    lineType: line.lineType === "custom-design" ? ("custom-design" as const) : ("product" as const)
  }));

  const validated = await validateCheckoutLinesCore(
    {
      currency: "EUR",
      lines: normalizedLines.map((line) => ({
        lineId: line.lineId,
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
        configurations: line.configurations
      }))
    },
    services
  );

  return {
    currency: validated.currency,
    totals: validated.totals,
    maxProductionTimeDays: validated.maxProductionTimeDays,
    lines: normalizedLines.map((line, index) => ({
      ...line,
      validated: validated.lines[index]
    }))
  };
}

export async function verifyReservedUploadIntegrity(uploadDoc: UploadDocument, services: ValidationServices) {
  await assertUploadStorageConsistency(uploadDoc, services);
}
