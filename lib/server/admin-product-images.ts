import "server-only";

import { randomUUID } from "node:crypto";
import { getAdminBucket, getAdminDb } from "@/lib/firebase/admin";
import { normalizeLegacyProductImage } from "@/lib/server/product-image-normalization";
import {
  ALLOWED_PRODUCT_IMAGE_MIME_TYPES,
  MAX_PRODUCT_IMAGE_UPLOAD_BYTES,
  MAX_PRODUCT_IMAGE_UPLOAD_COUNT,
  STORAGE_ROOTS
} from "@/shared/catalog";

export type ProductImageSyncStatus = "pending" | "synced" | "error";

export type AdminProductImageRecord = {
  id: string;
  productId: string;
  originalFilename?: string;
  mimeType?: string;
  fileSize?: number;
  storagePath: string;
  url: string;
  publicUrl: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
  syncStatus: ProductImageSyncStatus;
  syncError?: string;
  shopifyImageId?: string;
  createdAt: string;
  updatedAt: string;
};

type UploadableProductImage = {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

const PRODUCT_IMAGE_ROOT = `${STORAGE_ROOTS.productImages}`;

function nowIso() {
  return new Date().toISOString();
}

function sanitizeFilename(filename: string) {
  const normalized = filename.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-");
  return normalized.replace(/^-+|-+$/g, "") || "image";
}

function buildStoragePath(productId: string, imageId: string, filename: string) {
  return `${PRODUCT_IMAGE_ROOT}/${productId}/images/${imageId}-${sanitizeFilename(filename)}`;
}

function buildPublicUrl(bucketName: string, storagePath: string, downloadToken: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;
}

function normalizeImageDoc(productId: string, imageId: string, raw: unknown): AdminProductImageRecord {
  const image = normalizeLegacyProductImage(
    {
      source: "image-workflow",
      productId,
      imageId
    },
    raw
  );

  if (!image) {
    throw new Error(`Bild ${imageId} konnte nicht gelesen werden.`);
  }

  return {
    id: imageId,
    productId: image.productId || productId,
    originalFilename: image.originalFilename,
    mimeType: image.mimeType,
    fileSize: image.fileSize,
    storagePath: image.storagePath,
    url: image.url ?? image.publicUrl!,
    publicUrl: image.publicUrl ?? image.url!,
    altText: image.altText,
    sortOrder: image.sortOrder,
    isPrimary: image.isPrimary,
    syncStatus: image.syncStatus ?? "pending",
    syncError: image.syncError,
    shopifyImageId: image.shopifyImageId,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt ?? image.createdAt
  };
}

function assertImageMimeType(mimeType: string) {
  if (!ALLOWED_PRODUCT_IMAGE_MIME_TYPES.includes(mimeType as (typeof ALLOWED_PRODUCT_IMAGE_MIME_TYPES)[number])) {
    throw new Error(`Dateityp ${mimeType} wird nicht unterstuetzt.`);
  }
}

function assertImageSize(size: number) {
  if (size > MAX_PRODUCT_IMAGE_UPLOAD_BYTES) {
    throw new Error(`Datei ist groesser als ${Math.round(MAX_PRODUCT_IMAGE_UPLOAD_BYTES / (1024 * 1024))} MB.`);
  }
}

async function readImageRecords(productId: string) {
  const snapshot = await getAdminDb().collection("products").doc(productId).collection("images").get();

  return snapshot.docs
    .map((doc) => normalizeImageDoc(productId, doc.id, doc.data()))
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

async function writeImageRecords(productId: string, images: AdminProductImageRecord[]) {
  const batch = getAdminDb().batch();
  const productRef = getAdminDb().collection("products").doc(productId);

  const normalized = images.map((image, index) => ({
    ...image,
    productId,
    sortOrder: index,
    isPrimary: image.id === (images.find((entry) => entry.isPrimary)?.id ?? images[0]?.id)
  }));

  for (const image of normalized) {
    batch.set(productRef.collection("images").doc(image.id), {
      productId,
      ...(image.originalFilename ? { originalFilename: image.originalFilename } : {}),
      ...(image.mimeType ? { mimeType: image.mimeType } : {}),
      ...(typeof image.fileSize === "number" ? { fileSize: image.fileSize } : {}),
      storagePath: image.storagePath,
      url: image.url,
      publicUrl: image.publicUrl,
      altText: image.altText,
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary,
      syncStatus: image.syncStatus,
      ...(image.syncError ? { syncError: image.syncError } : {}),
      ...(image.shopifyImageId ? { shopifyImageId: image.shopifyImageId } : {}),
      createdAt: image.createdAt,
      updatedAt: image.updatedAt
    });
  }

  await batch.commit();
  return normalized;
}

export async function getProductImageRecords(productId: string) {
  return readImageRecords(productId);
}

export async function uploadProductImages(input: {
  productId: string;
  productTitle: string;
  files: UploadableProductImage[];
}) {
  if (input.files.length === 0) {
    throw new Error("Keine Dateien zum Upload uebergeben.");
  }

  if (input.files.length > MAX_PRODUCT_IMAGE_UPLOAD_COUNT) {
    throw new Error(`Maximal ${MAX_PRODUCT_IMAGE_UPLOAD_COUNT} Bilder pro Upload erlaubt.`);
  }

  const existingImages = await readImageRecords(input.productId);
  const bucket = getAdminBucket();
  const timestamp = nowIso();
  const uploadedImages: AdminProductImageRecord[] = [];

  for (const file of input.files) {
    assertImageMimeType(file.type);
    assertImageSize(file.size);

    const imageId = randomUUID();
    const storagePath = buildStoragePath(input.productId, imageId, file.name);
    const downloadToken = randomUUID();
    const fileRef = bucket.file(storagePath);

    await fileRef.save(Buffer.from(await file.arrayBuffer()), {
      resumable: false,
      contentType: file.type,
      metadata: {
        contentType: file.type,
        cacheControl: "public,max-age=31536000,immutable",
        metadata: {
          firebaseStorageDownloadTokens: downloadToken
        }
      }
    });

    uploadedImages.push({
      id: imageId,
      productId: input.productId,
      originalFilename: file.name,
      mimeType: file.type,
      fileSize: file.size,
      storagePath,
      url: buildPublicUrl(bucket.name, storagePath, downloadToken),
      publicUrl: buildPublicUrl(bucket.name, storagePath, downloadToken),
      altText: input.productTitle,
      sortOrder: existingImages.length + uploadedImages.length,
      isPrimary: existingImages.length + uploadedImages.length === 0,
      syncStatus: "pending",
      createdAt: timestamp,
      updatedAt: timestamp
    });
  }

  return writeImageRecords(input.productId, [...existingImages, ...uploadedImages]);
}

export async function updateProductImage(productId: string, imageId: string, input: {
  altText?: string;
  isPrimary?: boolean;
}) {
  const images = await readImageRecords(productId);
  const existing = images.find((image) => image.id === imageId);
  if (!existing) {
    throw new Error("Bild nicht gefunden.");
  }

  const timestamp = nowIso();
  const updatedImages = images.map((image) => {
    if (image.id !== imageId) {
      return input.isPrimary
        ? {
            ...image,
            isPrimary: false,
            updatedAt: timestamp,
            syncStatus: "pending" as const
          }
        : image;
    }

    return {
      ...image,
      ...(typeof input.altText === "string" ? { altText: input.altText.trim() || existing.altText } : {}),
      ...(typeof input.isPrimary === "boolean" ? { isPrimary: input.isPrimary } : {}),
      updatedAt: timestamp,
      syncStatus: "pending" as const,
      syncError: undefined
    };
  });

  return writeImageRecords(productId, updatedImages);
}

export async function reorderProductImages(productId: string, orderedImageIds: string[]) {
  const images = await readImageRecords(productId);
  if (images.length !== orderedImageIds.length) {
    throw new Error("Reihenfolge enthaelt nicht alle Produktbilder.");
  }

  const imageMap = new Map(images.map((image) => [image.id, image]));
  const reordered = orderedImageIds.map((id) => {
    const image = imageMap.get(id);
    if (!image) {
      throw new Error(`Unbekanntes Bild in der Reihenfolge: ${id}`);
    }

    return image;
  });

  const timestamp = nowIso();
  return writeImageRecords(
    productId,
    reordered.map((image) => ({
      ...image,
      updatedAt: timestamp,
      syncStatus: "pending",
      syncError: undefined
    }))
  );
}

export async function deleteProductImage(productId: string, imageId: string) {
  const images = await readImageRecords(productId);
  const imageToDelete = images.find((image) => image.id === imageId);
  if (!imageToDelete) {
    throw new Error("Bild nicht gefunden.");
  }

  const remainingImages = images.filter((image) => image.id !== imageId);
  const productRef = getAdminDb().collection("products").doc(productId);
  await productRef.collection("images").doc(imageId).delete();

  if (imageToDelete.storagePath) {
    await getAdminBucket()
      .file(imageToDelete.storagePath)
      .delete({ ignoreNotFound: true })
      .catch(() => undefined);
  }

  if (remainingImages.length === 0) {
    return remainingImages;
  }

  const timestamp = nowIso();
  return writeImageRecords(
    productId,
    remainingImages.map((image) => ({
      ...image,
      updatedAt: timestamp,
      syncStatus: image.isPrimary || image.shopifyImageId ? "pending" : image.syncStatus
    }))
  );
}
