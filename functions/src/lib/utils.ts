import { randomUUID } from "node:crypto";
import type { CallableRequest } from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import { ZodError } from "zod";
import {
  ALLOWED_ORDER_STATUS_TRANSITIONS,
  ALLOWED_PAYMENT_STATUS_TRANSITIONS,
  ALLOWED_PRODUCTION_STATUS_TRANSITIONS
} from "../../../shared/catalog/constants";
import { CheckoutSecurityError } from "../../../shared/catalog/security";
import type {
  OrderStatus,
  PaymentStatus,
  ProductionStatus,
  UserRole
} from "../../../shared/catalog/models";

export const REGION = "europe-west1";

export function nowIso() {
  return new Date().toISOString();
}

export function plusDaysIso(baseIso: string, days: number) {
  const date = new Date(baseIso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export function createPendingUploadPath(uploadId: string, originalFilename: string) {
  return `customer-uploads/pending/${uploadId}/${sanitizeFilename(originalFilename)}`;
}

export function createLinkedUploadPath(orderId: string, itemId: string, uploadId: string, originalFilename: string) {
  return `customer-uploads/${orderId}/${itemId}/${uploadId}-${sanitizeFilename(originalFilename)}`;
}

export function getRequestUserRole(request: CallableRequest<unknown>): "guest" | UserRole {
  return request.auth?.token.role === "admin" ? "admin" : request.auth ? "customer" : "guest";
}

export function requireAdmin(request: CallableRequest<unknown>) {
  if (request.auth?.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin privileges are required.");
  }
}

export function assertPaymentTransition(currentStatus: PaymentStatus, nextStatus: PaymentStatus) {
  if (!(ALLOWED_PAYMENT_STATUS_TRANSITIONS[currentStatus] as readonly string[]).includes(nextStatus)) {
    throw new HttpsError("failed-precondition", `Invalid payment status transition: ${currentStatus} -> ${nextStatus}`);
  }
}

export function assertOrderTransition(currentStatus: OrderStatus, nextStatus: OrderStatus) {
  if (!(ALLOWED_ORDER_STATUS_TRANSITIONS[currentStatus] as readonly string[]).includes(nextStatus)) {
    throw new HttpsError("failed-precondition", `Invalid order status transition: ${currentStatus} -> ${nextStatus}`);
  }
}

export function assertProductionTransition(currentStatus: ProductionStatus, nextStatus: ProductionStatus) {
  if (!(ALLOWED_PRODUCTION_STATUS_TRANSITIONS[currentStatus] as readonly string[]).includes(nextStatus)) {
    throw new HttpsError("failed-precondition", `Invalid production status transition: ${currentStatus} -> ${nextStatus}`);
  }
}

export function createUploadId() {
  return randomUUID();
}

function formatZodError(error: ZodError) {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "request";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

export function toCallableError(error: unknown, fallbackMessage: string) {
  if (error instanceof HttpsError) {
    return error;
  }

  if (error instanceof CheckoutSecurityError) {
    return new HttpsError(error.code, error.message);
  }

  if (error instanceof ZodError) {
    return new HttpsError("invalid-argument", formatZodError(error));
  }

  if (error instanceof Error) {
    return new HttpsError("internal", error.message || fallbackMessage);
  }

  return new HttpsError("internal", fallbackMessage);
}
