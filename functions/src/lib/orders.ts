import { HttpsError } from "firebase-functions/v2/https";
import type { DocumentReference } from "firebase-admin/firestore";
import {
  buildOrderTotals,
  checkoutValidationRequestSchema,
  linkUploadRequestSchema,
  orderStatusUpdateRequestSchema,
  productDocumentSchema,
  productOptionDocumentSchema,
  productOptionValueDocumentSchema,
  productVariantDocumentSchema,
  SHOP_PRICING_CONFIG,
  textOptionSchema,
  textareaOptionSchema,
  uploadDocumentSchema,
  uploadReservationRequestSchema
} from "../../../shared/catalog";
import type {
  CartConfigurationInput,
  CartConfigurationInputValue,
  OrderDocument,
  OrderItemConfigurationDocument,
  OrderItemDocument,
  UploadDocument,
  ValidatedCartConfiguration,
  ValidatedCartLine,
  ValidatedCheckout
} from "../../../shared/catalog";
import { getBucket, getDb } from "./firebase";
import {
  createLinkedUploadPath,
  createPendingUploadPath,
  createUploadId,
  nowIso,
  plusDaysIso
} from "./utils";

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

function throwBadRequest(message: string): never {
  throw new HttpsError("invalid-argument", message);
}

async function getProductContext(productId: string, variantId: string, cache: Map<string, Promise<ProductContext>>) {
  const cacheKey = `${productId}:${variantId}`;
  if (!cache.has(cacheKey)) {
    cache.set(
      cacheKey,
      (async () => {
        const productRef = getDb().collection("products").doc(productId);
        const [productSnap, variantSnap, optionSnap] = await Promise.all([
          productRef.get(),
          productRef.collection("variants").doc(variantId).get(),
          productRef.collection("options").get()
        ]);

        if (!productSnap.exists) {
          throwBadRequest(`Unknown product: ${productId}`);
        }

        if (!variantSnap.exists) {
          throwBadRequest(`Unknown variant for product ${productId}: ${variantId}`);
        }

        const productDoc = productDocumentSchema.parse(productSnap.data());
        const variantDoc = productVariantDocumentSchema.parse(variantSnap.data());

        if (productDoc.status !== "active") {
          throw new HttpsError("failed-precondition", `Product ${productId} is not active.`);
        }

        if (!variantDoc.isActive) {
          throw new HttpsError("failed-precondition", `Variant ${variantId} is not active.`);
        }

        if (variantDoc.stockMode === "tracked" && typeof variantDoc.stockQuantity === "number" && variantDoc.stockQuantity <= 0) {
          throw new HttpsError("failed-precondition", `Variant ${variantId} is out of stock.`);
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
        };
      })()
    );
  }

  return cache.get(cacheKey)!;
}

function ensureStringValue(value: CartConfigurationInputValue, optionName: string) {
  if (typeof value !== "string") {
    throwBadRequest(`Option ${optionName} requires a string value.`);
  }

  return value;
}

function ensureBooleanValue(value: CartConfigurationInputValue, optionName: string) {
  if (typeof value !== "boolean") {
    throwBadRequest(`Option ${optionName} requires a boolean value.`);
  }

  return value;
}

function ensureUploadValue(value: CartConfigurationInputValue, optionName: string) {
  if (!value || typeof value !== "object" || !("uploadId" in value)) {
    throwBadRequest(`Option ${optionName} requires an upload reference.`);
  }

  return value;
}

async function getUploadDocument(uploadId: string, uploadCache: Map<string, Promise<UploadDocument>>) {
  if (!uploadCache.has(uploadId)) {
    uploadCache.set(
      uploadId,
      (async () => {
        const uploadSnap = await getDb().collection("uploads").doc(uploadId).get();
        if (!uploadSnap.exists) {
          throwBadRequest(`Unknown upload reference: ${uploadId}`);
        }

        return uploadDocumentSchema.parse(uploadSnap.data());
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
  uploadCache: Map<string, Promise<UploadDocument>>
) {
  const option = context.options.find((entry) => entry.id === config.optionId);
  if (!option) {
    throwBadRequest(`Unknown option ${config.optionId} for product ${context.productId}.`);
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
      throwBadRequest(`Invalid value for option ${option.doc.name}.`);
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
  const uploadDoc = await getUploadDocument(uploadValue.uploadId, uploadCache);
  if (uploadDoc.linkedOrderId) {
    throw new HttpsError("failed-precondition", `Upload ${uploadValue.uploadId} is already linked to an order.`);
  }

  if (option.doc.acceptedMimeTypes?.length && !option.doc.acceptedMimeTypes.includes(uploadDoc.mimeType)) {
    throw new HttpsError("failed-precondition", `Upload ${uploadValue.uploadId} has an invalid file type.`);
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
    throwBadRequest(`Missing required options for product ${context.productId}: ${missing.join(", ")}`);
  }
}

export async function validateCheckoutPayload(input: unknown) {
  const request = checkoutValidationRequestSchema.parse(input);
  if (request.currency !== SHOP_PRICING_CONFIG.currency) {
    throwBadRequest(`Unsupported currency ${request.currency}.`);
  }

  const productCache = new Map<string, Promise<ProductContext>>();
  const uploadCache = new Map<string, Promise<UploadDocument>>();
  const lines: ValidatedCartLine[] = [];

  for (const line of request.lines) {
    const context = await getProductContext(line.productId, line.variantId, productCache);
    const configMap = new Map((line.configurations ?? []).map((config) => [config.optionId, config]));

    if (configMap.size !== (line.configurations ?? []).length) {
      throwBadRequest(`Duplicate configuration option detected in line ${line.lineId}.`);
    }

    const configurations: ValidatedCartConfiguration[] = [];
    const seenOptionIds = new Set<string>();

    for (const option of context.options) {
      const providedConfig = configMap.get(option.id);
      if (!providedConfig) {
        continue;
      }

      seenOptionIds.add(option.id);
      configurations.push(await validateConfiguration(context, providedConfig, uploadCache));
    }

    if (seenOptionIds.size !== configMap.size) {
      const unknownOptionIds = [...configMap.keys()].filter((optionId) => !seenOptionIds.has(optionId));
      throwBadRequest(`Unknown options on line ${line.lineId}: ${unknownOptionIds.join(", ")}`);
    }

    enforceRequiredOptions(context, seenOptionIds);

    if (
      context.variantDoc.stockMode === "tracked" &&
      typeof context.variantDoc.stockQuantity === "number" &&
      line.quantity > context.variantDoc.stockQuantity
    ) {
      throw new HttpsError(
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
  const totals = buildOrderTotals({
    subtotalCents
  });

  return {
    source: request.source,
    currency: request.currency,
    customer: request.customer,
    shippingAddress: request.shippingAddress,
    billingAddress: request.billingAddress,
    notesCustomer: request.notesCustomer,
    lines,
    totals,
    maxProductionTimeDays: Math.max(...lines.map((line) => line.productionTimeDays), 0)
  } satisfies ValidatedCheckout;
}

async function reserveNextOrderNumber() {
  const counterRef = getDb().collection("meta").doc("orderCounter");
  return getDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(counterRef);
    const current = snapshot.exists ? (snapshot.data() as { year?: number; sequence?: number }) : {};
    const year = new Date().getUTCFullYear();
    const nextSequence = current.year === year ? (current.sequence ?? 0) + 1 : 1;

    transaction.set(counterRef, {
      year,
      sequence: nextSequence,
      updatedAt: nowIso()
    });

    return `LS-${year}-${String(nextSequence).padStart(5, "0")}`;
  });
}

async function ensureUploadFileExists(storagePath: string) {
  const [exists] = await getBucket().file(storagePath).exists();
  if (!exists) {
    throw new HttpsError("failed-precondition", `Upload file ${storagePath} does not exist in storage.`);
  }
}

export async function linkUploadToOrderItem(input: {
  uploadId: string;
  orderId: string;
  itemId: string;
  optionId: string;
}) {
  const request = linkUploadRequestSchema.parse(input);
  const uploadRef = getDb().collection("uploads").doc(request.uploadId);
  const uploadSnap = await uploadRef.get();
  if (!uploadSnap.exists) {
    throwBadRequest(`Unknown upload ${request.uploadId}.`);
  }

  const uploadDoc = uploadDocumentSchema.parse(uploadSnap.data());
  await ensureUploadFileExists(uploadDoc.storagePath);

  const destinationPath = createLinkedUploadPath(
    request.orderId,
    request.itemId,
    request.uploadId,
    uploadDoc.originalFilename
  );

  const sourceFile = getBucket().file(uploadDoc.storagePath);
  const destinationFile = getBucket().file(destinationPath);
  await sourceFile.copy(destinationFile);
  await sourceFile.delete({ ignoreNotFound: true });

  await uploadRef.set(
    {
      storagePath: destinationPath,
      linkedOrderId: request.orderId,
      linkedOrderItemId: request.itemId,
      linkedOptionId: request.optionId,
      reviewStatus: "linked",
      allowGuestUpload: false,
      updatedAt: nowIso()
    },
    { merge: true }
  );
}

async function writeOrderItem(orderRef: DocumentReference, line: ValidatedCartLine, createdAt: string) {
  const itemRef = orderRef.collection("items").doc();
  const itemDoc: OrderItemDocument = {
    productId: line.productId,
    variantId: line.variantId,
    skuSnapshot: line.sku,
    productTitleSnapshot: line.productTitle,
    variantNameSnapshot: line.variantName,
    unitPriceSnapshotCents: line.unitPriceCents,
    quantity: line.quantity,
    lineSubtotalCents: line.lineSubtotalCents,
    lineTotalCents: line.lineTotalCents,
    isPersonalized: line.isPersonalized,
    designPreviewUrl: line.designPreviewUrl,
    customData: line.customData,
    createdAt
  };

  await itemRef.set(itemDoc);

  for (const configuration of line.configurations) {
    const configurationRef = itemRef.collection("configurations").doc();
    const configurationDoc: OrderItemConfigurationDocument = {
      optionId: configuration.optionId,
      optionCodeSnapshot: configuration.optionCode,
      optionNameSnapshot: configuration.optionName,
      optionTypeSnapshot: configuration.optionType,
      value: configuration.value,
      renderedValue: configuration.renderedValue,
      priceModifierSnapshotCents: configuration.priceModifierCents,
      uploadId: configuration.uploadId,
      createdAt
    };

    await configurationRef.set(configurationDoc);

    if (configuration.uploadId) {
      await linkUploadToOrderItem({
        uploadId: configuration.uploadId,
        orderId: orderRef.id,
        itemId: itemRef.id,
        optionId: configuration.optionId
      });
    }
  }
}

export async function createOrderFromValidatedCheckout(validatedCheckout: ValidatedCheckout, ownerUid?: string) {
  const createdAt = nowIso();
  const orderNumber = await reserveNextOrderNumber();
  const orderRef = getDb().collection("orders").doc();
  const orderDoc: OrderDocument = {
    orderNumber,
    ownerUid,
    customerEmail: validatedCheckout.customer.email,
    customerFirstName: validatedCheckout.customer.firstName,
    customerLastName: validatedCheckout.customer.lastName,
    customerPhone: validatedCheckout.customer.phone,
    source: validatedCheckout.source,
    currency: validatedCheckout.currency,
    subtotalCents: validatedCheckout.totals.subtotalCents,
    shippingTotalCents: validatedCheckout.totals.shippingTotalCents,
    taxTotalCents: validatedCheckout.totals.taxTotalCents,
    discountTotalCents: validatedCheckout.totals.discountTotalCents,
    grandTotalCents: validatedCheckout.totals.grandTotalCents,
    paymentStatus: "pending",
    orderStatus: "placed",
    productionStatus: "queued",
    productionDueDate: plusDaysIso(createdAt, validatedCheckout.maxProductionTimeDays),
    shippingAddress: validatedCheckout.shippingAddress,
    billingAddress: validatedCheckout.billingAddress,
    notesCustomer: validatedCheckout.notesCustomer,
    itemCount: validatedCheckout.lines.reduce((sum, line) => sum + line.quantity, 0),
    maxProductionTimeDays: validatedCheckout.maxProductionTimeDays,
    createdAt,
    updatedAt: createdAt
  };

  await orderRef.set(orderDoc);
  for (const line of validatedCheckout.lines) {
    await writeOrderItem(orderRef, line, createdAt);
  }

  if (ownerUid) {
    await getDb()
      .collection("customers")
      .doc(ownerUid)
      .set(
        {
          email: validatedCheckout.customer.email,
          firstName: validatedCheckout.customer.firstName,
          lastName: validatedCheckout.customer.lastName,
          role: "customer",
          updatedAt: createdAt,
          createdAt
        },
        { merge: true }
      );
  }

  return {
    orderId: orderRef.id,
    orderNumber,
    totals: validatedCheckout.totals,
    paymentStatus: orderDoc.paymentStatus,
    orderStatus: orderDoc.orderStatus,
    productionStatus: orderDoc.productionStatus
  };
}

export function createUploadReservationDocument(input: {
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  ownerUid?: string;
  createdByRole: "guest" | "customer" | "admin";
}) {
  const request = uploadReservationRequestSchema.parse(input);
  const uploadId = createUploadId();
  const timestamp = nowIso();
  return {
    uploadId,
    uploadDoc: {
      ownerUid: input.ownerUid,
      createdByRole: input.createdByRole,
      storagePath: createPendingUploadPath(uploadId, request.originalFilename),
      originalFilename: request.originalFilename,
      mimeType: request.mimeType,
      fileSize: request.fileSize,
      reviewStatus: "pending_upload",
      allowGuestUpload: true,
      expiresAt: plusDaysIso(timestamp, 1),
      createdAt: timestamp,
      updatedAt: timestamp
    } satisfies UploadDocument
  };
}

export function parseOrderStatusUpdate(input: unknown) {
  return orderStatusUpdateRequestSchema.parse(input);
}
