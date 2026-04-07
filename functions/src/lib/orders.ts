import { FieldValue } from "firebase-admin/firestore";
import type { DocumentReference } from "firebase-admin/firestore";
import {
  CheckoutSecurityError,
  assertSvgUploadIsAllowed,
  linkUploadRequestSchema,
  orderStatusUpdateRequestSchema,
  uploadDocumentSchema,
  uploadReservationRequestSchema,
  validateCheckoutPayload,
  verifyReservedUploadIntegrity
} from "../../../shared/catalog";
import type {
  OrderDocument,
  OrderItemConfigurationDocument,
  OrderItemDocument,
  UploadDocument,
  ValidatedCartLine,
  ValidatedCheckout
} from "../../../shared/catalog";
import { getBucket, getDb } from "./firebase";
import { createLinkedUploadPath, createPendingUploadPath, createUploadId, nowIso, plusDaysIso } from "./utils";

const UPLOAD_ALREADY_USED_ERROR_MESSAGE = "Upload has already been used.";
const UPLOAD_LINK_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

function summarizeOrderCustomData(customData?: Record<string, unknown>) {
  if (!customData) {
    return undefined;
  }

  const designVersion = typeof customData.designVersion === "number" ? customData.designVersion : undefined;
  const designProductId = typeof customData.designProductId === "string" ? customData.designProductId : undefined;
  const designUpdatedAt = typeof customData.designUpdatedAt === "string" ? customData.designUpdatedAt : undefined;
  const elementCount = typeof customData.elementCount === "number" ? customData.elementCount : undefined;
  const hasUploads = typeof customData.hasUploads === "boolean" ? customData.hasUploads : undefined;
  const elementTypes = Array.isArray(customData.elementTypes)
    ? customData.elementTypes.filter((entry): entry is string => typeof entry === "string").slice(0, 50)
    : undefined;

  const sanitized = {
    ...(typeof designVersion === "number" ? { designVersion } : {}),
    ...(designProductId ? { designProductId } : {}),
    ...(designUpdatedAt ? { designUpdatedAt } : {}),
    ...(typeof elementCount === "number" ? { elementCount } : {}),
    ...(typeof hasUploads === "boolean" ? { hasUploads } : {}),
    ...(elementTypes && elementTypes.length > 0 ? { elementTypes } : {})
  } satisfies Record<string, unknown>;

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function sanitizeOrderPreviewUrl(previewUrl?: string) {
  if (!previewUrl || previewUrl.startsWith("data:")) {
    return undefined;
  }

  return previewUrl;
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

function assertUploadCanBeLinked(uploadDoc: UploadDocument, now: Date) {
  if (uploadDoc.linkedOrderId) {
    throw new CheckoutSecurityError("failed-precondition", UPLOAD_ALREADY_USED_ERROR_MESSAGE);
  }

  if (uploadDoc.reviewStatus !== "pending_upload") {
    throw new CheckoutSecurityError("failed-precondition", `Upload ${uploadDoc.originalFilename} cannot be linked in its current state.`);
  }

  if (uploadDoc.lockedAt) {
    const lockedAt = Date.parse(uploadDoc.lockedAt);
    if (Number.isFinite(lockedAt) && now.getTime() - lockedAt < UPLOAD_LINK_LOCK_TIMEOUT_MS) {
      throw new CheckoutSecurityError("failed-precondition", "Upload is currently being processed.");
    }
  }
}

async function acquireUploadLinkLock(input: {
  uploadId: string;
}) {
  const uploadRef = getDb().collection("uploads").doc(input.uploadId);
  const lockTimestamp = nowIso();
  const now = new Date(lockTimestamp);

  const uploadDoc = await getDb().runTransaction(async (transaction) => {
    const uploadSnap = await transaction.get(uploadRef);
    if (!uploadSnap.exists) {
      throw new CheckoutSecurityError("invalid-argument", `Unknown upload ${input.uploadId}.`);
    }

    const parsedUploadDoc = uploadDocumentSchema.parse(uploadSnap.data());
    assertUploadCanBeLinked(parsedUploadDoc, now);

    transaction.set(
      uploadRef,
      {
        lockedAt: lockTimestamp,
        updatedAt: lockTimestamp
      },
      { merge: true }
    );

    return parsedUploadDoc;
  });

  return {
    uploadDoc,
    lockTimestamp
  };
}

async function releaseUploadLinkLock(input: {
  uploadId: string;
  lockTimestamp: string;
}) {
  const uploadRef = getDb().collection("uploads").doc(input.uploadId);
  await getDb().runTransaction(async (transaction) => {
    const uploadSnap = await transaction.get(uploadRef);
    if (!uploadSnap.exists) {
      return;
    }

    const uploadDoc = uploadDocumentSchema.parse(uploadSnap.data());
    if (uploadDoc.linkedOrderId || uploadDoc.lockedAt !== input.lockTimestamp) {
      return;
    }

    transaction.set(
      uploadRef,
      {
        lockedAt: FieldValue.delete(),
        updatedAt: nowIso()
      },
      { merge: true }
    );
  });
}

async function finalizeUploadLink(input: {
  uploadId: string;
  orderId: string;
  itemId: string;
  optionId: string;
  destinationPath: string;
  lockTimestamp: string;
}) {
  const uploadRef = getDb().collection("uploads").doc(input.uploadId);
  await getDb().runTransaction(async (transaction) => {
    const uploadSnap = await transaction.get(uploadRef);
    if (!uploadSnap.exists) {
      throw new CheckoutSecurityError("invalid-argument", `Unknown upload ${input.uploadId}.`);
    }

    const uploadDoc = uploadDocumentSchema.parse(uploadSnap.data());
    if (uploadDoc.linkedOrderId) {
      throw new CheckoutSecurityError("failed-precondition", UPLOAD_ALREADY_USED_ERROR_MESSAGE);
    }

    if (uploadDoc.lockedAt !== input.lockTimestamp) {
      throw new CheckoutSecurityError("failed-precondition", "Upload lock was lost before linking could finish.");
    }

    transaction.set(
      uploadRef,
      {
        storagePath: input.destinationPath,
        linkedOrderId: input.orderId,
        linkedOrderItemId: input.itemId,
        linkedOptionId: input.optionId,
        reviewStatus: "linked",
        allowGuestUpload: false,
        lockedAt: FieldValue.delete(),
        updatedAt: nowIso()
      },
      { merge: true }
    );
  });
}

export async function linkUploadToOrderItem(input: {
  uploadId: string;
  orderId: string;
  itemId: string;
  optionId: string;
}) {
  const request = linkUploadRequestSchema.parse(input);
  const { uploadDoc, lockTimestamp } = await acquireUploadLinkLock({
    uploadId: request.uploadId
  });

  try {
    await verifyReservedUploadIntegrity(uploadDoc, {
      db: getDb(),
      bucket: getBucket()
    });

    const destinationPath = createLinkedUploadPath(
      request.orderId,
      request.itemId,
      request.uploadId,
      uploadDoc.originalFilename
    );

    const sourceFile = getBucket().file(uploadDoc.storagePath);
    const destinationFile = getBucket().file(destinationPath);

    await sourceFile.copy(destinationFile);

    try {
      await finalizeUploadLink({
        uploadId: request.uploadId,
        orderId: request.orderId,
        itemId: request.itemId,
        optionId: request.optionId,
        destinationPath,
        lockTimestamp
      });
    } catch (error) {
      await destinationFile.delete({ ignoreNotFound: true }).catch(() => undefined);
      throw error;
    }

    await sourceFile.delete({ ignoreNotFound: true }).catch(() => undefined);
  } catch (error) {
    await releaseUploadLinkLock({
      uploadId: request.uploadId,
      lockTimestamp
    }).catch(() => undefined);
    throw error;
  }
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
    designPreviewUrl: sanitizeOrderPreviewUrl(line.designPreviewUrl),
    customData: summarizeOrderCustomData(line.customData),
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
  assertSvgUploadIsAllowed(request.mimeType);
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
