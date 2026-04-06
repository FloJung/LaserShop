import "server-only";

import { productImageDocumentSchema } from "@/shared/catalog";

type ParseContext = {
  source: "admin" | "storefront" | "image-workflow" | "shopify";
  productId: string;
  imageId: string;
};

function nowIso() {
  return new Date().toISOString();
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function pickNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function pickBoolean(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") {
      return value;
    }
  }

  return undefined;
}

function logInvalidImage(context: ParseContext, raw: unknown, reason: string) {
  console.warn("[catalog] invalid product image skipped:", {
    source: context.source,
    productId: context.productId,
    imageId: context.imageId,
    reason,
    keys: asRecord(raw) ? Object.keys(raw as Record<string, unknown>) : null
  });
}

export function normalizeLegacyProductImage(context: ParseContext, raw: unknown) {
  const record = asRecord(raw);
  if (!record) {
    logInvalidImage(context, raw, "Image document is not an object.");
    return null;
  }

  const resolvedUrl = pickString(record, ["publicUrl", "url", "src", "image", "imageUrl", "downloadUrl"]);
  const resolvedStoragePath =
    pickString(record, ["storagePath", "path", "filePath", "objectPath"]) ??
    (resolvedUrl ? `legacy/${context.productId}/${context.imageId}` : undefined);
  const createdAt = pickString(record, ["createdAt", "updatedAt"]) ?? nowIso();

  const normalized = {
    productId: pickString(record, ["productId", "productID"]) ?? context.productId,
    originalFilename: pickString(record, ["originalFilename", "filename", "fileName", "title"]),
    mimeType: pickString(record, ["mimeType", "contentType"]),
    fileSize: pickNumber(record, ["fileSize", "size", "bytes"]),
    storagePath: resolvedStoragePath,
    url: resolvedUrl,
    publicUrl: pickString(record, ["publicUrl", "url", "src", "image", "imageUrl", "downloadUrl"]) ?? resolvedUrl,
    altText: pickString(record, ["altText", "alt", "title"]) ?? `Produktbild ${context.imageId}`,
    sortOrder: pickNumber(record, ["sortOrder", "position", "order"]) ?? 0,
    isPrimary: pickBoolean(record, ["isPrimary", "primary", "featured"]) ?? false,
    syncStatus: pickString(record, ["syncStatus"]) ?? undefined,
    syncError: pickString(record, ["syncError"]),
    shopifyImageId: pickString(record, ["shopifyImageId"]),
    createdAt,
    updatedAt: pickString(record, ["updatedAt"]) ?? createdAt
  };

  const parsed = productImageDocumentSchema.safeParse(normalized);
  if (!parsed.success) {
    logInvalidImage(
      context,
      raw,
      parsed.error.issues.map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`).join("; ")
    );
    return null;
  }

  return parsed.data;
}
