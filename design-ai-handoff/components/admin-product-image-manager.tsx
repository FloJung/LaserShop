"use client";

import clsx from "clsx";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ImageIcon,
  LoaderCircle,
  RefreshCcw,
  Star,
  Trash2,
  UploadCloud,
  XCircle
} from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState
} from "react";
import {
  ALLOWED_PRODUCT_IMAGE_MIME_TYPES,
  MAX_PRODUCT_IMAGE_UPLOAD_BYTES,
  MAX_PRODUCT_IMAGE_UPLOAD_COUNT
} from "@/shared/catalog";

type ProductImageItem = {
  id: string;
  originalFilename?: string;
  mimeType?: string;
  fileSize?: number;
  storagePath?: string;
  url?: string;
  publicUrl?: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
  syncStatus?: "pending" | "synced" | "error";
  syncError?: string;
  shopifyImageId?: string;
  createdAt: string;
  updatedAt?: string;
};

type UploadQueueItem = {
  id: string;
  file: File;
  fileName: string;
  previewUrl: string;
  status: "queued" | "uploading" | "success" | "error";
  error?: string;
};

type ImageMutationResponse = {
  error?: string;
  images?: ProductImageItem[];
};

type AdminProductImageManagerProps = {
  productId: string;
  productTitle: string;
  images: ProductImageItem[];
  isBusy: boolean;
  isSyncing: boolean;
  onImagesPersisted: (images: ProductImageItem[]) => void;
  onRetryShopifySync: () => Promise<void>;
};

const compactInputClassName =
  "admin-field !min-h-[2rem] !rounded-none !px-2 !py-1.5 !text-sm !shadow-none";

function createLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}`;
}

function formatBytes(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getSyncTone(status?: ProductImageItem["syncStatus"]) {
  if (status === "synced") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "error") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getSyncLabel(status?: ProductImageItem["syncStatus"]) {
  if (status === "synced") {
    return "Shopify synced";
  }

  if (status === "error") {
    return "Sync error";
  }

  return "Pending sync";
}

function buildUploadError(file: File) {
  if (!ALLOWED_PRODUCT_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_PRODUCT_IMAGE_MIME_TYPES)[number])) {
    return "Nur JPG, PNG und WEBP sind erlaubt.";
  }

  if (file.size > MAX_PRODUCT_IMAGE_UPLOAD_BYTES) {
    return `Maximal ${Math.round(MAX_PRODUCT_IMAGE_UPLOAD_BYTES / (1024 * 1024))} MB pro Bild.`;
  }

  return null;
}

function ProductImageCard({
  image,
  index,
  total,
  disabled,
  isSyncing,
  onSaveAltText,
  onSetPrimary,
  onMove,
  onDelete,
  onRetrySync
}: {
  image: ProductImageItem;
  index: number;
  total: number;
  disabled: boolean;
  isSyncing: boolean;
  onSaveAltText: (imageId: string, altText: string) => Promise<void>;
  onSetPrimary: (imageId: string) => Promise<void>;
  onMove: (imageId: string, direction: -1 | 1) => Promise<void>;
  onDelete: (imageId: string) => Promise<void>;
  onRetrySync: () => Promise<void>;
}) {
  const [altText, setAltText] = useState(image.altText);
  const [isSavingAlt, setIsSavingAlt] = useState(false);

  useEffect(() => {
    setAltText(image.altText);
  }, [image.altText, image.id]);

  async function commitAltText() {
    const normalizedAltText = altText.trim();
    if (!normalizedAltText || normalizedAltText === image.altText || disabled || isSavingAlt) {
      setAltText(image.altText);
      return;
    }

    setIsSavingAlt(true);

    try {
      await onSaveAltText(image.id, normalizedAltText);
    } finally {
      setIsSavingAlt(false);
    }
  }

  function handleAltKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    void commitAltText();
    event.currentTarget.blur();
  }

  return (
    <article className="admin-subpanel border-t border-slate-300 p-2 first:border-t-0">
      <div className="flex gap-2">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-slate-300 bg-white">
          {image.publicUrl || image.url ? (
            <img
              src={image.publicUrl ?? image.url}
              alt={image.altText || image.originalFilename || "Produktbild"}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="h-4 w-4 text-slate-400" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-medium text-slate-950">
              {image.originalFilename || `Bild ${index + 1}`}
            </p>
            {image.isPrimary ? (
              <span className="inline-flex items-center gap-1 border border-emerald-300 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                <Star className="h-3 w-3" />
                Primary
              </span>
            ) : null}
            <span
              className={clsx(
                "inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                getSyncTone(image.syncStatus)
              )}
            >
              {image.syncStatus === "synced" ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : image.syncStatus === "error" ? (
                <AlertCircle className="h-3 w-3" />
              ) : (
                <LoaderCircle className="h-3 w-3" />
              )}
              {getSyncLabel(image.syncStatus)}
            </span>
          </div>

          <div className="mt-1 grid gap-0.5 text-[11px] text-slate-500">
            <p className="truncate">Pfad: {image.storagePath || image.publicUrl || image.url || "-"}</p>
            <p>
              Datei: {image.mimeType || "-"} · {formatBytes(image.fileSize)}
            </p>
            <p>
              Position: {index + 1} / {total}
              {image.shopifyImageId ? ` · Shopify ${image.shopifyImageId}` : ""}
            </p>
            {image.syncError ? <p className="text-rose-700">{image.syncError}</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-2 grid gap-2 border-t border-slate-300 pt-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <label className="grid gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Alt-Text</span>
          <div className="relative">
            <input
              value={altText}
              disabled={disabled || isSavingAlt}
              onChange={(event) => setAltText(event.target.value)}
              onBlur={() => {
                void commitAltText();
              }}
              onKeyDown={handleAltKeyDown}
              className={clsx(compactInputClassName, isSavingAlt && "pr-8")}
            />
            {isSavingAlt ? (
              <LoaderCircle className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400" />
            ) : null}
          </div>
        </label>

        <div className="flex flex-wrap items-center gap-1 lg:justify-end">
          <button
            type="button"
            disabled={disabled || index === 0}
            onClick={() => {
              void onMove(image.id, -1);
            }}
            className="admin-action-secondary !px-2 !py-1 disabled:cursor-not-allowed disabled:opacity-50"
            title="Nach oben"
            aria-label="Nach oben"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled || index === total - 1}
            onClick={() => {
              void onMove(image.id, 1);
            }}
            className="admin-action-secondary !px-2 !py-1 disabled:cursor-not-allowed disabled:opacity-50"
            title="Nach unten"
            aria-label="Nach unten"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled || image.isPrimary}
            onClick={() => {
              void onSetPrimary(image.id);
            }}
            className="admin-action-secondary !px-2 !py-1 disabled:cursor-not-allowed disabled:opacity-50"
            title="Als Primary setzen"
            aria-label="Als Primary setzen"
          >
            <Star className="h-3.5 w-3.5" />
          </button>
          {image.syncStatus === "error" ? (
            <button
              type="button"
              disabled={disabled || isSyncing}
              onClick={() => {
                void onRetrySync();
              }}
              className="admin-action-secondary !px-2 !py-1 disabled:cursor-not-allowed disabled:opacity-50"
              title="Sync erneut"
              aria-label="Sync erneut"
            >
              <RefreshCcw className={clsx("h-3.5 w-3.5", isSyncing && "animate-spin")} />
            </button>
          ) : null}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              void onDelete(image.id);
            }}
            className="admin-action-danger !px-2 !py-1 disabled:cursor-not-allowed disabled:opacity-50"
            title="Bild loeschen"
            aria-label="Bild loeschen"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

export function AdminProductImageManager({
  productId,
  productTitle,
  images,
  isBusy,
  isSyncing,
  onImagesPersisted,
  onRetryShopifySync
}: AdminProductImageManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadQueueRef = useRef<UploadQueueItem[]>([]);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingImageIds, setPendingImageIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    uploadQueueRef.current = uploadQueue;
  }, [uploadQueue]);

  useEffect(() => {
    return () => {
      for (const entry of uploadQueueRef.current) {
        URL.revokeObjectURL(entry.previewUrl);
      }
    };
  }, []);

  const totalBusy = isBusy || isUploading;
  const pendingSyncCount = images.filter((image) => image.syncStatus === "pending").length;
  const failedSyncCount = images.filter((image) => image.syncStatus === "error").length;

  function markQueueItem(id: string, patch: Partial<UploadQueueItem>) {
    setUploadQueue((current) => current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function removeQueueItem(id: string) {
    setUploadQueue((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }

      return current.filter((entry) => entry.id !== id);
    });
  }

  function setImagePending(imageId: string, active: boolean) {
    setPendingImageIds((current) =>
      active ? Array.from(new Set([...current, imageId])) : current.filter((entry) => entry !== imageId)
    );
  }

  async function parseImageResponse(response: Response, fallbackMessage: string) {
    const payload = (await response.json().catch(() => null)) as ImageMutationResponse | null;
    if (!response.ok || !payload?.images) {
      throw new Error(payload?.error ?? fallbackMessage);
    }

    onImagesPersisted(payload.images);
    return payload.images;
  }

  async function uploadFilesSequentially(entries: UploadQueueItem[]) {
    if (entries.length === 0) {
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    let successCount = 0;

    try {
      for (const entry of entries) {
        markQueueItem(entry.id, { status: "uploading", error: undefined });

        try {
          const formData = new FormData();
          formData.append("files", entry.file);

          const response = await fetch(`/api/admin/products/${productId}/images`, {
            method: "POST",
            body: formData
          });

          await parseImageResponse(response, "Bildupload fehlgeschlagen.");
          markQueueItem(entry.id, { status: "success" });
          successCount += 1;
        } catch (error) {
          markQueueItem(entry.id, {
            status: "error",
            error: error instanceof Error ? error.message : "Bildupload fehlgeschlagen."
          });
        }
      }
    } finally {
      setIsUploading(false);
    }

    if (successCount > 0) {
      setSuccessMessage(
        successCount === 1 ? "Bild erfolgreich hochgeladen." : `${successCount} Bilder erfolgreich hochgeladen.`
      );
    }
  }

  function queueFiles(nextFiles: File[]) {
    if (nextFiles.length === 0 || totalBusy) {
      return;
    }

    const acceptedFiles = nextFiles.slice(0, MAX_PRODUCT_IMAGE_UPLOAD_COUNT);
    const overflowFiles = nextFiles.slice(MAX_PRODUCT_IMAGE_UPLOAD_COUNT);
    const nextEntries: UploadQueueItem[] = [];

    for (const file of acceptedFiles) {
      const validationError = buildUploadError(file);
      const entry: UploadQueueItem = {
        id: createLocalId("upload"),
        file,
        fileName: file.name,
        previewUrl: URL.createObjectURL(file),
        status: validationError ? "error" : "queued",
        ...(validationError ? { error: validationError } : {})
      };

      nextEntries.push(entry);
    }

    for (const file of overflowFiles) {
      nextEntries.push({
        id: createLocalId("upload"),
        file,
        fileName: file.name,
        previewUrl: URL.createObjectURL(file),
        status: "error",
        error: `Maximal ${MAX_PRODUCT_IMAGE_UPLOAD_COUNT} Bilder pro Upload-Vorgang.`
      });
    }

    setUploadQueue((current) => [...nextEntries, ...current]);

    const validEntries = nextEntries.filter((entry) => entry.status === "queued");
    const invalidEntries = nextEntries.filter((entry) => entry.status === "error");

    if (invalidEntries.length > 0) {
      setErrorMessage("Mindestens eine Datei konnte wegen Format oder Groesse nicht hochgeladen werden.");
    }

    void uploadFilesSequentially(validEntries);
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    queueFiles(selectedFiles);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (totalBusy) {
      return;
    }

    setIsDragging(false);
    queueFiles(Array.from(event.dataTransfer.files ?? []));
  }

  async function mutateImage(
    imageId: string,
    request: () => Promise<Response>,
    successText: string,
    fallbackMessage: string
  ) {
    setImagePending(imageId, true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await request();
      await parseImageResponse(response, fallbackMessage);
      setSuccessMessage(successText);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : fallbackMessage);
    } finally {
      setImagePending(imageId, false);
    }
  }

  async function handleSaveAltText(imageId: string, altText: string) {
    await mutateImage(
      imageId,
      () =>
        fetch(`/api/admin/products/${productId}/images/${imageId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ altText })
        }),
      "Alt-Text gespeichert.",
      "Alt-Text konnte nicht gespeichert werden."
    );
  }

  async function handleSetPrimary(imageId: string) {
    await mutateImage(
      imageId,
      () =>
        fetch(`/api/admin/products/${productId}/images/${imageId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ isPrimary: true })
        }),
      "Primary-Bild aktualisiert.",
      "Primary-Bild konnte nicht gesetzt werden."
    );
  }

  async function handleDelete(imageId: string) {
    const shouldDelete = window.confirm("Dieses Bild wirklich loeschen?");
    if (!shouldDelete) {
      return;
    }

    await mutateImage(
      imageId,
      () =>
        fetch(`/api/admin/products/${productId}/images/${imageId}`, {
          method: "DELETE"
        }),
      "Bild geloescht.",
      "Bild konnte nicht geloescht werden."
    );
  }

  async function handleMove(imageId: string, direction: -1 | 1) {
    const sortedImages = [...images].sort((left, right) => left.sortOrder - right.sortOrder);
    const currentIndex = sortedImages.findIndex((image) => image.id === imageId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sortedImages.length) {
      return;
    }

    const orderedImageIds = sortedImages.map((image) => image.id);

    const [movedId] = orderedImageIds.splice(currentIndex, 1);
    orderedImageIds.splice(targetIndex, 0, movedId);

    await mutateImage(
      imageId,
      () =>
        fetch(`/api/admin/products/${productId}/images/reorder`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ orderedImageIds })
        }),
      "Bildreihenfolge aktualisiert.",
      "Bildreihenfolge konnte nicht gespeichert werden."
    );
  }

  async function handleRetryUpload(entry: UploadQueueItem) {
    markQueueItem(entry.id, { status: "queued", error: undefined });
    await uploadFilesSequentially([entry]);
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={totalBusy ? -1 : 0}
        onClick={() => {
          if (!totalBusy) {
            fileInputRef.current?.click();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!totalBusy) {
              fileInputRef.current?.click();
            }
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!totalBusy) {
            setIsDragging(true);
          }
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={clsx(
          "border border-dashed border-slate-300 px-2 py-2",
          isDragging ? "bg-slate-100" : "bg-white",
          totalBusy && "cursor-not-allowed opacity-75",
          !totalBusy && "cursor-pointer"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp"
          onChange={handleFileSelection}
          className="hidden"
          disabled={totalBusy}
        />

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-slate-300 bg-white text-slate-500">
              {isUploading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-950">Bild hochladen</p>
              <p className="text-xs text-slate-500">
                Drag & Drop oder Dateiauswahl. JPG, PNG und WEBP bis{" "}
                {Math.round(MAX_PRODUCT_IMAGE_UPLOAD_BYTES / (1024 * 1024))} MB.
              </p>
              <p className="text-[11px] text-slate-500">
                {productTitle || "Produkt"}: Upload, Primary, Alt-Text, Reihenfolge, Sync.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <span className="inline-flex items-center gap-1 border border-slate-300 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
              {images.length} Bilder
            </span>
            <span className="inline-flex items-center gap-1 border border-amber-300 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700">
              {pendingSyncCount} pending
            </span>
            <span className="inline-flex items-center gap-1 border border-rose-300 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-700">
              {failedSyncCount} Fehler
            </span>
            <button
              type="button"
              disabled={totalBusy}
              onClick={(event) => {
                event.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="admin-action-secondary !px-2 !py-1 !text-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              Upload
            </button>
          </div>
        </div>
      </div>

      {errorMessage ? <p className="admin-alert admin-alert-error">{errorMessage}</p> : null}
      {successMessage ? <p className="admin-alert admin-alert-success">{successMessage}</p> : null}

      {uploadQueue.length > 0 ? (
        <div className="border border-slate-300">
          {uploadQueue.map((entry) => (
            <article key={entry.id} className="grid gap-2 border-t border-slate-300 px-2 py-2 first:border-t-0 md:grid-cols-[56px_minmax(0,1fr)_auto] md:items-start">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border border-slate-300 bg-white">
                  <img src={entry.previewUrl} alt={entry.fileName} className="h-full w-full object-cover" />
                </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-950">{entry.fileName}</p>
                <p className="text-[11px] text-slate-500">{formatBytes(entry.file.size)}</p>

                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span
                    className={clsx(
                      "inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                      entry.status === "success" && "border-emerald-300 bg-emerald-50 text-emerald-700",
                      entry.status === "error" && "border-rose-300 bg-rose-50 text-rose-700",
                      (entry.status === "queued" || entry.status === "uploading") &&
                        "border-amber-300 bg-amber-50 text-amber-700"
                    )}
                  >
                    {entry.status === "uploading" ? (
                      <LoaderCircle className="h-3 w-3 animate-spin" />
                    ) : entry.status === "success" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : entry.status === "error" ? (
                      <AlertCircle className="h-3 w-3" />
                    ) : (
                      <UploadCloud className="h-3 w-3" />
                    )}
                    {entry.status}
                  </span>
                  {entry.status === "error" ? (
                    <button
                      type="button"
                      disabled={isUploading || isBusy}
                      onClick={() => {
                        void handleRetryUpload(entry);
                      }}
                      className="admin-action-secondary !px-2 !py-1 !text-xs disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" />
                      Retry
                    </button>
                  ) : null}
                </div>

                {entry.error ? <p className="mt-1 text-[11px] text-rose-700">{entry.error}</p> : null}
              </div>

              <div className="flex justify-start md:justify-end">
                <button
                  type="button"
                  onClick={() => removeQueueItem(entry.id)}
                  className="admin-action-secondary !px-2 !py-1"
                  aria-label="Upload-Eintrag entfernen"
                  title="Upload-Eintrag entfernen"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {images.length === 0 ? (
        <div className="border border-dashed border-slate-300 px-2 py-3 text-sm text-slate-500">
          Noch keine Bilder vorhanden. Lade das erste Produktbild direkt hier hoch.
        </div>
      ) : (
        <div className="border border-slate-300">
          {images
            .slice()
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((image, index, sortedImages) => (
              <ProductImageCard
                key={image.id}
                image={image}
                index={index}
                total={sortedImages.length}
                disabled={totalBusy || pendingImageIds.includes(image.id)}
                isSyncing={isSyncing}
                onSaveAltText={handleSaveAltText}
                onSetPrimary={handleSetPrimary}
                onMove={handleMove}
                onDelete={handleDelete}
                onRetrySync={onRetryShopifySync}
              />
            ))}
        </div>
      )}

      <p className="text-[11px] text-slate-500">
        Shopify-Sync nutzt die gespeicherten Backend-Bilder.
      </p>
    </div>
  );
}
