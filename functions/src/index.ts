import { logger } from "firebase-functions";
import { CallableRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import { getAdminAuth, getBucket, getDb } from "./lib/firebase";
import { validateCheckoutPayload } from "../../shared/catalog";
import { getCheckoutSecurityEvents, getDefaultSecuritySeverity, getDerivedSecurityEventsForReason } from "../../shared/security-monitoring";
import {
  createOrderFromValidatedCheckout,
  createUploadReservationDocument,
  parseOrderStatusUpdate
} from "./lib/orders";
import {
  assertOrderTransition,
  assertPaymentTransition,
  assertProductionTransition,
  REGION,
  getRequestUserRole,
  nowIso,
  requireAdmin,
  toCallableError
} from "./lib/utils";
import { createGlobalCallableRateLimiter } from "./lib/rate-limit-global";
import { assertCallableIpNotBlocked, logCallableSecurityEvents } from "./lib/security-monitoring";

const uploadReservationRateLimiter = createGlobalCallableRateLimiter({
  limit: 10,
  window: "60 s",
  fallbackWindowMs: 60_000
});

export const validateCart = onCall({ region: REGION }, async (request: CallableRequest<unknown>) => {
  try {
    await assertCallableIpNotBlocked(request, "functions.validateCart");
    const validatedCheckout = await validateCheckoutPayload(request.data, {
      db: getDb(),
      bucket: getBucket()
    });
    return {
      currency: validatedCheckout.currency,
      totals: validatedCheckout.totals,
      maxProductionTimeDays: validatedCheckout.maxProductionTimeDays,
      lines: validatedCheckout.lines
    };
  } catch (error) {
    logger.error("validateCart failed", error);
    if (error instanceof Error && error.name === "CheckoutSecurityError") {
      await logCallableSecurityEvents(request, getCheckoutSecurityEvents(error.message), "functions.validateCart").catch((loggingError) => {
        logger.error("validateCart security logging failed", loggingError);
      });
    }
    throw toCallableError(error, "validateCart failed.");
  }
});

export const createOrderFromCart = onCall({ region: REGION }, async (request: CallableRequest<unknown>) => {
  try {
    await assertCallableIpNotBlocked(request, "functions.createOrderFromCart");
    const validatedCheckout = await validateCheckoutPayload(request.data, {
      db: getDb(),
      bucket: getBucket()
    });
    return await createOrderFromValidatedCheckout(validatedCheckout, request.auth?.uid);
  } catch (error) {
    logger.error("createOrderFromCart failed", error);
    if (error instanceof Error && error.name === "CheckoutSecurityError") {
      await logCallableSecurityEvents(request, getCheckoutSecurityEvents(error.message), "functions.createOrderFromCart").catch((loggingError) => {
        logger.error("createOrderFromCart security logging failed", loggingError);
      });
    }
    throw toCallableError(error, "createOrderFromCart failed.");
  }
});

export const createUploadReservation = onCall({ region: REGION }, async (request: CallableRequest<unknown>) => {
  try {
    await assertCallableIpNotBlocked(request, "functions.createUploadReservation");
    await uploadReservationRateLimiter.limit(request, {
      endpoint: "upload-reservation"
    });

    const role = getRequestUserRole(request);
    const { uploadId, uploadDoc } = createUploadReservationDocument({
      ...(request.data as {
        originalFilename: string;
        mimeType: string;
        fileSize: number;
      }),
      ownerUid: request.auth?.uid,
      createdByRole: role
    });

    await getDb().collection("uploads").doc(uploadId).set(uploadDoc);
    return {
      uploadId,
      storagePath: uploadDoc.storagePath,
      expiresAt: uploadDoc.expiresAt
    };
  } catch (error) {
    logger.error("createUploadReservation failed", error);
    if (error instanceof HttpsError && error.code === "resource-exhausted") {
      await logCallableSecurityEvents(
        request,
        [
          {
            type: "rate_limit_hit",
            severity: getDefaultSecuritySeverity("rate_limit_hit"),
            reason: error.message
          }
        ],
        "functions.createUploadReservation"
      ).catch((loggingError) => {
        logger.error("createUploadReservation rate limit logging failed", loggingError);
      });
    } else if (error instanceof Error) {
      const derivedEvents = getDerivedSecurityEventsForReason(error.message);
      if (derivedEvents.length > 0) {
        await logCallableSecurityEvents(request, derivedEvents, "functions.createUploadReservation").catch((loggingError) => {
          logger.error("createUploadReservation security logging failed", loggingError);
        });
      }
    }
    throw toCallableError(error, "createUploadReservation failed.");
  }
});

export const updateOrderStatus = onCall({ region: REGION }, async (request: CallableRequest<unknown>) => {
  requireAdmin(request);

  try {
    const input = parseOrderStatusUpdate(request.data);
    const orderRef = getDb().collection("orders").doc(input.orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      throw new HttpsError("not-found", `Order ${input.orderId} does not exist.`);
    }

    const order = orderSnap.data() as {
      paymentStatus: string;
      orderStatus: string;
      productionStatus: string;
    };

    if (input.paymentStatus) {
      assertPaymentTransition(order.paymentStatus as never, input.paymentStatus);
    }

    if (input.orderStatus) {
      assertOrderTransition(order.orderStatus as never, input.orderStatus);
    }

    if (input.productionStatus) {
      assertProductionTransition(order.productionStatus as never, input.productionStatus);
    }

    await orderRef.set(
      {
        ...(input.paymentStatus ? { paymentStatus: input.paymentStatus } : {}),
        ...(input.orderStatus ? { orderStatus: input.orderStatus } : {}),
        ...(input.productionStatus ? { productionStatus: input.productionStatus } : {}),
        ...(typeof input.notesInternal === "string" ? { notesInternal: input.notesInternal } : {}),
        updatedAt: nowIso()
      },
      { merge: true }
    );

    return { success: true };
  } catch (error) {
    logger.error("updateOrderStatus failed", error);
    throw toCallableError(error, "updateOrderStatus failed.");
  }
});

export const setUserRole = onCall({ region: REGION }, async (request: CallableRequest<unknown>) => {
  requireAdmin(request);

  const data = request.data as { uid?: string; role?: "customer" | "admin" };
  if (!data.uid || !data.role) {
    throw new HttpsError("invalid-argument", "uid and role are required.");
  }

  await getAdminAuth().setCustomUserClaims(data.uid, { role: data.role });
  await getDb()
    .collection("customers")
    .doc(data.uid)
    .set(
      {
        role: data.role,
        updatedAt: nowIso()
      },
      { merge: true }
    );

  return { success: true };
});
