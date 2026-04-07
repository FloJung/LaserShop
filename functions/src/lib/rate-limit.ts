import { createHash } from "node:crypto";
import type { CallableRequest } from "firebase-functions/v2/https";
import { HttpsError as FirebaseHttpsError } from "firebase-functions/v2/https";
import { getDb } from "./firebase";
import { nowIso } from "./utils";

export const RATE_LIMIT_ERROR_MESSAGE = "Too many requests. Please try again later.";

function getHeaderValue(headers: Record<string, string | string[] | undefined>, name: string) {
  const value = headers[name];
  if (Array.isArray(value)) {
    return value.find((entry) => typeof entry === "string" && entry.trim())?.trim() ?? "";
  }

  return typeof value === "string" ? value.trim() : "";
}

function getRequestIpAddress(request: CallableRequest<unknown>) {
  const rawRequest = request.rawRequest as
    | {
        ip?: string;
        headers?: Record<string, string | string[] | undefined>;
      }
    | undefined;

  const headers = rawRequest?.headers ?? {};
  const forwardedFor = getHeaderValue(headers, "x-forwarded-for");
  if (forwardedFor) {
    const firstHop = forwardedFor
      .split(",")
      .map((entry) => entry.trim())
      .find(Boolean);
    if (firstHop) {
      return firstHop;
    }
  }

  const fallbackHeaders = ["cf-connecting-ip", "x-real-ip", "fly-client-ip"];
  for (const headerName of fallbackHeaders) {
    const value = getHeaderValue(headers, headerName);
    if (value) {
      return value;
    }
  }

  return rawRequest?.ip?.trim() || "unknown";
}

function createRateLimitDocumentId(namespace: string, identity: string, windowId: number) {
  return createHash("sha256")
    .update(`${namespace}:${identity}:${windowId}`)
    .digest("hex");
}

export async function assertCallableRateLimit(
  request: CallableRequest<unknown>,
  input: {
    namespace: string;
    limit: number;
    windowMs: number;
  }
) {
  const now = Date.now();
  const windowId = Math.floor(now / input.windowMs);
  const ipAddress = getRequestIpAddress(request);
  const userId = request.auth?.uid?.trim();
  const identity = userId ? `${ipAddress}:${userId}` : ipAddress;
  const rateLimitRef = getDb().collection("securityRateLimits").doc(createRateLimitDocumentId(input.namespace, identity, windowId));

  await getDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateLimitRef);
    const existingData = snapshot.data();
    const currentCount = snapshot.exists ? Number(existingData?.count ?? 0) : 0;

    if (currentCount >= input.limit) {
      throw new FirebaseHttpsError("resource-exhausted", RATE_LIMIT_ERROR_MESSAGE);
    }

    const timestamp = nowIso();
    transaction.set(
      rateLimitRef,
      {
        namespace: input.namespace,
        identity,
        count: currentCount + 1,
        windowMs: input.windowMs,
        windowId,
        createdAt: snapshot.exists ? existingData?.createdAt ?? timestamp : timestamp,
        updatedAt: timestamp,
        expiresAt: new Date((windowId + 1) * input.windowMs).toISOString()
      },
      { merge: true }
    );
  });
}
