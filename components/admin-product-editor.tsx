"use client";

import clsx from "clsx";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  ImageIcon,
  Layers3,
  LoaderCircle,
  Package2,
  SlidersHorizontal,
  Star,
  Store,
  TriangleAlert
} from "lucide-react";
import {
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition
} from "react";
import { useRouter } from "next/navigation";
import { AdminDeleteProductButton } from "@/components/admin-delete-product-button";
import { AdminProductImageManager } from "@/components/admin-product-image-manager";
import { collections, glassTypes, occasions, shopCategories } from "@/lib/data/products";
import {
  getProductPublicationChecklist,
  type ProductPublicationChecklistItem,
  type ProductPublicationChecklistStatus
} from "@/shared/catalog/publication";

type EditableVariant = {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  compareAtPriceCents?: number;
  currency: "EUR";
  stockMode: "unlimited" | "tracked" | "made_to_order";
  stockQuantity?: number;
  isActive: boolean;
  weightGrams?: number;
  productionTimeDays: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type EditableImage = {
  id: string;
  productId?: string;
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

type EditableOptionValue = {
  id: string;
  label: string;
  value: string;
  sortOrder: number;
  priceModifierCents?: number;
  isActive: boolean;
};

type EditableOption = {
  id: string;
  name: string;
  code: string;
  type: "text" | "textarea" | "select" | "checkbox" | "file";
  isRequired: boolean;
  helpText?: string;
  placeholder?: string;
  maxLength?: number;
  priceModifierCents?: number;
  pricingMode: "none" | "fixed" | "per_character";
  sortOrder: number;
  isActive: boolean;
  acceptedMimeTypes?: string[];
  createdAt: string;
  updatedAt: string;
  values: EditableOptionValue[];
};

type EditableProduct = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  category: string;
  shopCategory: string;
  glassType: string;
  collection: string;
  collectionSlug: string;
  designer: string;
  occasion: string;
  badge?: string;
  featured: boolean;
  care: string;
  benefits: string[];
  rating: number;
  reviews: number;
  status: "draft" | "active" | "archived";
  shopifySyncStatus?: "pending" | "synced" | "error";
  shopifySyncError?: string;
  shopifyLastSyncedAt?: string;
  shopifyLastAttemptedAt?: string;
  isPersonalizable: boolean;
  defaultVariantId?: string;
  createdAt: string;
  updatedAt: string;
  variants: EditableVariant[];
  images: EditableImage[];
  options: EditableOption[];
};

type AdminProductEditorProps = {
  product: EditableProduct;
};

type ShopifySyncState = {
  success: boolean;
  action?: "create" | "update";
  responseStatus?: number | null;
  error?: string | null;
  shopifyError?: string | null;
  shopifyProductId?: string | null;
  shopifyVariantId?: string | null;
  mappingWritten?: boolean;
  mappingExists?: boolean;
  mappingPath?: string | null;
  tokenSource?: "env" | "memory" | null;
  imageSync?: {
    success: boolean;
    syncedCount: number;
    createdCount: number;
    updatedCount: number;
    deletedCount: number;
    failedCount: number;
    failedImageIds: string[];
    errors: Array<{
      imageId: string;
      message: string;
    }>;
  };
};

type SavePayload = {
  error?: string;
  updatedAt?: string;
  images?: EditableImage[];
  product?: EditableProduct;
  validationIssues?: Array<{
    field: string;
    message: string;
  }>;
  shopifySync?: ShopifySyncState;
};

type ShopifySyncResponse = ShopifySyncState & {
  images?: EditableImage[];
  product?: EditableProduct;
  validationIssues?: Array<{
    field: string;
    message: string;
  }>;
  shopifySync?: ShopifySyncState;
};

type FeaturedUpdateSuccess = {
  ok: true;
  changed: boolean;
  productId: string;
  featured: boolean;
  updatedAt: string;
  message: string;
};

type FeaturedUpdateFailure = {
  ok: false;
  productId: string;
  featured: boolean;
  error: string;
};

type FeaturedUpdateResponse = FeaturedUpdateSuccess | FeaturedUpdateFailure;

type SectionLink = {
  id: string;
  label: string;
  count?: string;
};

const compactFieldClassName = "admin-field !min-h-[2.75rem] !rounded-xl !px-3 !py-2.5 !text-sm !shadow-none";
const compactTextareaClassName = `${compactFieldClassName} min-h-0 resize-none overflow-hidden leading-6`;

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function asOptionalNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function joinLines(values: string[]) {
  return values.join("\n");
}

function splitCommaList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function joinCommaList(values?: string[]) {
  return (values ?? []).join(", ");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatMoneyFromCents(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(value / 100);
}

function formatValidationIssueMessage(
  issues?: Array<{
    field: string;
    message: string;
  }>
) {
  if (!issues || issues.length === 0) {
    return null;
  }

  return issues.map((issue) => issue.message).join(" ");
}

function getStatusLabel(status: EditableProduct["status"]) {
  if (status === "active") {
    return "Active";
  }

  if (status === "archived") {
    return "Archived";
  }

  return "Draft";
}

function getStatusTone(status: EditableProduct["status"]) {
  if (status === "active") {
    return "success";
  }

  if (status === "archived") {
    return "neutral";
  }

  return "warning";
}

function getStockSummary(variant: EditableVariant) {
  if (variant.stockMode === "tracked") {
    return `${variant.stockQuantity ?? 0} auf Lager`;
  }

  if (variant.stockMode === "made_to_order") {
    return "Made to order";
  }

  return "Unbegrenzt";
}

function getStockTone(variant: EditableVariant) {
  if (!variant.isActive) {
    return "neutral";
  }

  if (variant.stockMode === "tracked" && (variant.stockQuantity ?? 0) <= 0) {
    return "danger";
  }

  if (variant.stockMode === "made_to_order") {
    return "warning";
  }

  return "success";
}

function getPublicationStatusLabel(status: ProductPublicationChecklistStatus) {
  if (status === "complete") {
    return "Erfuellt";
  }

  if (status === "incomplete") {
    return "Unvollstaendig";
  }

  return "Fehlt";
}

function getPublicationStatusTone(status: ProductPublicationChecklistStatus) {
  if (status === "complete") {
    return "success" as const;
  }

  if (status === "incomplete") {
    return "warning" as const;
  }

  return "danger" as const;
}

function withUpdatedSortOrder<T extends { sortOrder: number }>(items: T[]) {
  return items.map((item, index) => ({
    ...item,
    sortOrder: index
  }));
}

function MetaPill({
  children,
  tone = "neutral"
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
        tone === "danger" && "border-rose-200 bg-rose-50 text-rose-700",
        tone === "neutral" && "border-slate-200 bg-white/80 text-slate-600"
      )}
    >
      {children}
    </span>
  );
}

function Field({
  label,
  hint,
  publicationStatus,
  publicationHint,
  className,
  children
}: {
  label: string;
  hint?: string;
  publicationStatus?: ProductPublicationChecklistStatus;
  publicationHint?: string;
  className?: string;
  children: ReactNode;
}) {
  const hasPublicationState = Boolean(publicationStatus);
  const helperText = publicationHint ?? hint;
  const publicationTone = publicationStatus ? getPublicationStatusTone(publicationStatus) : undefined;

  return (
    <label className={clsx("grid gap-1.5", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
        {publicationTone ? (
          <MetaPill tone={publicationTone}>
            Pflicht fuer active
          </MetaPill>
        ) : null}
      </div>
      <div
        className={clsx(
          hasPublicationState && "rounded-[1rem] border px-2.5 py-2",
          publicationStatus === "complete" && "border-emerald-200 bg-emerald-50/45",
          publicationStatus === "incomplete" && "border-amber-200 bg-amber-50/45",
          publicationStatus === "missing" && "border-rose-200 bg-rose-50/45"
        )}
      >
        {children}
      </div>
      {helperText ? (
        <span
          className={clsx(
            "text-xs",
            publicationStatus === "missing"
              ? "text-rose-700"
              : publicationStatus === "incomplete"
                ? "text-amber-700"
                : "text-slate-500"
          )}
        >
          {helperText}
        </span>
      ) : null}
    </label>
  );
}

function CompactInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(compactFieldClassName, className)} />;
}

function CompactSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={clsx(compactFieldClassName, className)}>
      {children}
    </select>
  );
}

function AutoResizeTextarea({
  className,
  minRows = 3,
  ...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "rows"> & { minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    element.style.height = "0px";
    element.style.height = `${Math.max(element.scrollHeight, minRows * 26 + 18)}px`;
  }, [props.value, minRows]);

  return <textarea ref={ref} rows={minRows} {...props} className={clsx(compactTextareaClassName, className)} />;
}

function SectionCard({
  id,
  title,
  hint,
  icon,
  action,
  children
}: {
  id: string;
  title: string;
  hint?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 admin-panel rounded-[1.5rem] p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 border-b border-[rgba(148,163,184,0.14)] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{title}</h2>
          </div>
          {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="admin-subpanel rounded-[1.25rem] px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </article>
  );
}

function PublicationRequirementCard({
  item
}: {
  item: ProductPublicationChecklistItem;
}) {
  return (
    <a
      href={`#${item.sectionId}`}
      className={clsx(
        "rounded-[1.1rem] border px-3.5 py-3 transition hover:bg-white/90",
        item.status === "complete" && "border-emerald-200 bg-emerald-50/55",
        item.status === "incomplete" && "border-amber-200 bg-amber-50/55",
        item.status === "missing" && "border-rose-200 bg-rose-50/55"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">{item.label}</p>
          <p className="mt-1 text-xs text-slate-500">{item.description}</p>
        </div>
        <MetaPill tone={getPublicationStatusTone(item.status)}>{getPublicationStatusLabel(item.status)}</MetaPill>
      </div>
      <p
        className={clsx(
          "mt-3 text-xs leading-5",
          item.status === "complete"
            ? "text-emerald-700"
            : item.status === "incomplete"
              ? "text-amber-700"
              : "text-rose-700"
        )}
      >
        {item.detail}
      </p>
    </a>
  );
}

function PublicationSectionSummary({
  title,
  items,
  extraIssue
}: {
  title: string;
  items: ProductPublicationChecklistItem[];
  extraIssue?: string;
}) {
  return (
    <div className="mb-4 rounded-[1.1rem] border border-[rgba(148,163,184,0.18)] bg-white/72 px-3.5 py-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-xs text-slate-500">
            Diese Punkte werden fuer die Aktivierung auf `active` live geprueft.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <MetaPill key={item.id} tone={getPublicationStatusTone(item.status)}>
              {item.label}: {getPublicationStatusLabel(item.status)}
            </MetaPill>
          ))}
        </div>
      </div>
      {extraIssue ? <p className="mt-3 text-xs text-amber-700">Zusaetzlicher Backend-Check: {extraIssue}</p> : null}
    </div>
  );
}

function SidebarNav({ sections }: { sections: SectionLink[] }) {
  return (
    <nav className="admin-panel rounded-[1.5rem] p-4">
      <p className="text-sm font-semibold text-slate-950">Bereiche</p>
      <div className="mt-3 space-y-1">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-white/80 hover:text-slate-950"
          >
            <span>{section.label}</span>
            {section.count ? (
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {section.count}
              </span>
            ) : null}
          </a>
        ))}
      </div>
    </nav>
  );
}

export function AdminProductEditor({ product }: AdminProductEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(product);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(product));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<ShopifySyncState | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTogglingFeatured, setIsTogglingFeatured] = useState(false);
  const [openVariantIds, setOpenVariantIds] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(product.variants.map((variant, index) => [variant.id, index === 0]))
  );
  const [openOptionIds, setOpenOptionIds] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(product.options.map((option, index) => [option.id, index === 0]))
  );
  const [isPending, startTransition] = useTransition();

  const benefitsText = joinLines(draft.benefits);
  const hasUnsavedChanges = JSON.stringify(draft) !== savedSnapshot;
  const isBusy = isSaving || isSyncing || isTogglingFeatured || isPending;
  const publicationChecklist = getProductPublicationChecklist(draft);
  const publicationItemsById = Object.fromEntries(
    publicationChecklist.items.map((item) => [item.id, item])
  ) as Record<ProductPublicationChecklistItem["id"], ProductPublicationChecklistItem>;
  const publishStatusLabel = publicationChecklist.isReady
    ? "Bereit fuer active"
    : "Nicht veroeffentlichbar";
  const publishStatusHint = publicationChecklist.isReady
    ? "Alle Kernanforderungen sind aktuell erfuellt."
    : `${publicationChecklist.completedCount} von ${publicationChecklist.totalCount} Kernanforderungen sind aktuell erfuellt.`;
  const activeVariants = draft.variants.filter((variant) => variant.isActive);
  const publicationVariant =
    draft.variants.find((variant) => variant.id === draft.defaultVariantId && variant.isActive) ??
    activeVariants[0] ??
    draft.variants[0];
  const sectionLinks: SectionLink[] = [
    { id: "basic", label: "Basisdaten" },
    { id: "visibility", label: "Sichtbarkeit" },
    { id: "categorization", label: "Kategorisierung" },
    { id: "description", label: "Beschreibung" },
    { id: "variants", label: "Varianten", count: String(draft.variants.length) },
    { id: "media", label: "Medien", count: String(draft.images.length) },
    { id: "personalization", label: "Personalisierung", count: String(draft.options.length) }
  ];

  function confirmNavigation(message: string) {
    if (!hasUnsavedChanges) {
      return true;
    }

    return window.confirm(message);
  }

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (hasUnsavedChanges) {
      setSaveMessage(null);
    }
  }, [hasUnsavedChanges]);

  function setField<K extends keyof EditableProduct>(key: K, value: EditableProduct[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  }

  function replacePersistedImages(
    nextImages: EditableImage[],
    options?: {
      clearSyncState?: boolean;
    }
  ) {
    setDraft((current) => ({
      ...current,
      images: nextImages
    }));

    setSavedSnapshot((currentSnapshot) => {
      const parsedSnapshot = JSON.parse(currentSnapshot) as EditableProduct;
      return JSON.stringify({
        ...parsedSnapshot,
        images: nextImages
      });
    });

    if (options?.clearSyncState) {
      setSyncState(null);
    }
  }

  function updateVariant(variantId: string, updater: (variant: EditableVariant) => EditableVariant) {
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant) => (variant.id === variantId ? updater(variant) : variant))
    }));
  }

  function updateOption(optionId: string, updater: (option: EditableOption) => EditableOption) {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option) => (option.id === optionId ? updater(option) : option))
    }));
  }

  function updateOptionValue(
    optionId: string,
    valueId: string,
    updater: (optionValue: EditableOptionValue) => EditableOptionValue
  ) {
    updateOption(optionId, (option) => ({
      ...option,
      values: option.values.map((value) => (value.id === valueId ? updater(value) : value))
    }));
  }

  function toggleVariantOpen(variantId: string) {
    setOpenVariantIds((current) => ({
      ...current,
      [variantId]: !current[variantId]
    }));
  }

  function toggleOptionOpen(optionId: string) {
    setOpenOptionIds((current) => ({
      ...current,
      [optionId]: !current[optionId]
    }));
  }

  async function persistDraft(refreshAfterSave: boolean) {
    setSaveError(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/products/${draft.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(draft)
      });

      const payload = (await response.json().catch(() => null)) as SavePayload | null;

      if (!response.ok) {
        setSaveError(
          payload?.error ?? formatValidationIssueMessage(payload?.validationIssues) ?? "Produkt konnte nicht gespeichert werden."
        );
        return { ok: false as const, payload: null, nextDraft: null };
      }

      const nextDraft = payload?.product ?? {
        ...draft,
        updatedAt: payload?.updatedAt ?? draft.updatedAt,
        images: payload?.images ?? draft.images
      };

      setDraft(nextDraft);
      setSavedSnapshot(JSON.stringify(nextDraft));
      setSyncState(payload?.shopifySync ?? null);

      if (refreshAfterSave) {
        startTransition(() => {
          router.refresh();
        });
      }

      return { ok: true as const, payload, nextDraft };
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave() {
    setSaveMessage(null);
    setSyncError(null);

    const result = await persistDraft(true);
    if (!result.ok) {
      return false;
    }

    const publishMessage =
      result.nextDraft?.status === "active"
        ? "Produkt gespeichert und im Shop veroeffentlicht."
        : result.nextDraft?.status === "draft"
          ? "Produkt gespeichert und im Shop verborgen."
          : "Produkt gespeichert und aus dem oeffentlichen Shop entfernt.";

    setSaveMessage(
      result.payload?.shopifySync?.success === false
        ? `${publishMessage} Shopify-Sync fehlgeschlagen: ${result.payload.shopifySync.shopifyError ?? result.payload.shopifySync.error ?? "Unbekannter Fehler."}`
        : result.payload?.shopifySync?.success
          ? `${publishMessage} Shopify wurde synchronisiert.`
          : publishMessage
    );

    return true;
  }

  async function handleFeaturedToggle() {
    if (isBusy) {
      return;
    }

    setSaveMessage(null);
    setSaveError(null);
    setSyncError(null);
    setIsTogglingFeatured(true);

    const nextFeatured = !draft.featured;

    try {
      const response = await fetch(`/api/admin/products/${draft.id}/featured`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          featured: nextFeatured
        })
      });

      const payload = (await response.json().catch(() => null)) as FeaturedUpdateResponse | null;

      if (!response.ok || !payload) {
        setSaveError(payload && !payload.ok ? payload.error : "Bestseller-Status konnte nicht aktualisiert werden.");
        return;
      }

      if (!payload.ok) {
        setSaveError(payload.error);
        return;
      }

      setDraft((current) => ({
        ...current,
        featured: payload.featured,
        updatedAt: payload.updatedAt
      }));
      setSavedSnapshot((currentSnapshot) => {
        const parsedSnapshot = JSON.parse(currentSnapshot) as EditableProduct;
        return JSON.stringify({
          ...parsedSnapshot,
          featured: payload.featured,
          updatedAt: payload.updatedAt
        });
      });
      setSaveMessage(payload.message);

      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsTogglingFeatured(false);
    }
  }

  async function handleShopifySync() {
    setSyncError(null);
    setSaveError(null);
    setSyncState(null);

    if (hasUnsavedChanges) {
      const shouldSaveFirst = window.confirm(
        "Es gibt ungespeicherte Aenderungen. Diese werden zuerst gespeichert, bevor der Shopify-Sync startet. Fortfahren?"
      );

      if (!shouldSaveFirst) {
        return;
      }

      const saveResult = await persistDraft(false);
      if (!saveResult.ok) {
        setSyncError("Shopify-Sync abgebrochen, weil das Speichern fehlgeschlagen ist.");
        return;
      }

      setSaveMessage("Aenderungen gespeichert. Shopify-Sync wird ausgefuehrt.");
      setSyncState(null);
    }

    setIsSyncing(true);

    try {
      const response = await fetch(`/api/admin/products/${draft.id}/shopify-sync`, {
        method: "POST"
      });

      const payload = (await response.json().catch(() => null)) as ShopifySyncResponse | null;

      if (!response.ok && !payload) {
        setSyncError("Shopify-Sync konnte nicht ausgefuehrt werden.");
        return;
      }

      if (payload) {
        setSyncState(payload.shopifySync ?? payload);
        if (payload.images) {
          replacePersistedImages(payload.images);
        }
        if (payload.product) {
          setDraft(payload.product);
          setSavedSnapshot(JSON.stringify(payload.product));
        }
      }

      if (!response.ok) {
        setSyncError(
          payload?.shopifyError ??
            payload?.error ??
            formatValidationIssueMessage(payload?.validationIssues) ??
            "Shopify-Sync fehlgeschlagen."
        );
        return;
      }

      setSaveMessage(payload?.success ? "Shopify-Sync erfolgreich abgeschlossen." : "Shopify-Sync abgeschlossen.");
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsSyncing(false);
    }
  }

  function goToProductList() {
    const shouldLeave = confirmNavigation(
      "Ungespeicherte Aenderungen verwerfen und zur Produktliste zurueckkehren?"
    );

    if (!shouldLeave) {
      return;
    }

    router.push("/admin/products");
  }

  function addVariant() {
    const nextVariantId = createId("variant");

    setDraft((current) => {
      const nextVariants = withUpdatedSortOrder([
        ...current.variants,
        {
          id: nextVariantId,
          sku: `${current.id.toUpperCase()}-${current.variants.length + 1}`,
          name: `Variante ${current.variants.length + 1}`,
          priceCents: current.variants[0]?.priceCents ?? 0,
          currency: "EUR" as const,
          stockMode: "unlimited" as const,
          isActive: true,
          productionTimeDays: current.variants[0]?.productionTimeDays ?? 3,
          sortOrder: current.variants.length,
          createdAt: current.updatedAt,
          updatedAt: current.updatedAt
        }
      ]);

      return {
        ...current,
        variants: nextVariants,
        defaultVariantId: current.defaultVariantId ?? nextVariants[0]?.id
      };
    });

    setOpenVariantIds((current) => ({
      ...current,
      [nextVariantId]: true
    }));
  }

  function removeVariant(variantId: string) {
    setDraft((current) => {
      const remainingVariants = withUpdatedSortOrder(current.variants.filter((variant) => variant.id !== variantId));

      return {
        ...current,
        variants: remainingVariants,
        defaultVariantId:
          current.defaultVariantId === variantId ? remainingVariants[0]?.id : current.defaultVariantId
      };
    });

    setOpenVariantIds((current) => {
      const nextState = { ...current };
      delete nextState[variantId];
      return nextState;
    });
  }

  function addOption() {
    const nextOptionId = createId("option");

    setDraft((current) => ({
      ...current,
      options: withUpdatedSortOrder([
        ...current.options,
        {
          id: nextOptionId,
          name: `Option ${current.options.length + 1}`,
          code: `option-${current.options.length + 1}`,
          type: "text",
          isRequired: false,
          helpText: "",
          placeholder: "",
          maxLength: 80,
          priceModifierCents: 0,
          pricingMode: "none",
          sortOrder: current.options.length,
          isActive: true,
          acceptedMimeTypes: [],
          createdAt: current.updatedAt,
          updatedAt: current.updatedAt,
          values: []
        }
      ])
    }));

    setOpenOptionIds((current) => ({
      ...current,
      [nextOptionId]: true
    }));
  }

  function removeOption(optionId: string) {
    setDraft((current) => ({
      ...current,
      options: withUpdatedSortOrder(current.options.filter((option) => option.id !== optionId))
    }));

    setOpenOptionIds((current) => {
      const nextState = { ...current };
      delete nextState[optionId];
      return nextState;
    });
  }

  function addSelectValue(optionId: string) {
    updateOption(optionId, (option) => ({
      ...option,
      values: withUpdatedSortOrder([
        ...option.values,
        {
          id: createId("value"),
          label: `Option ${option.values.length + 1}`,
          value: `option-${option.values.length + 1}`,
          sortOrder: option.values.length,
          priceModifierCents: 0,
          isActive: true
        }
      ])
    }));
  }

  function removeSelectValue(optionId: string, valueId: string) {
    updateOption(optionId, (option) => ({
      ...option,
      values: withUpdatedSortOrder(option.values.filter((value) => value.id !== valueId))
    }));
  }

  return (
    <section className="section">
      <div className="shell admin-editor space-y-4">
        <header className="admin-panel rounded-[1.75rem] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
                <span>Admin Product</span>
                <MetaPill tone={getStatusTone(draft.status)}>{getStatusLabel(draft.status)}</MetaPill>
                <MetaPill tone={draft.featured ? "warning" : "neutral"}>
                  {draft.featured ? "Bestseller aktiv" : "Kein Bestseller"}
                </MetaPill>
                {draft.badge ? <MetaPill>{draft.badge}</MetaPill> : null}
              </div>
              <h1 className="mt-3 truncate text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-3xl">
                {draft.title || "Unbenanntes Produkt"}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-500">
                Kompakter Produkt-Editor fuer Stammdaten, Varianten, Medien und Personalisierung.
              </p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[420px]">
              <SummaryCard label="Varianten" value={String(draft.variants.length)} hint="Kaufbare Auspraegungen" />
              <SummaryCard label="Medien" value={String(draft.images.length)} hint="Bilder im Produkt" />
              <SummaryCard label="Optionen" value={String(draft.options.length)} hint="Personalisierungsfelder" />
              <SummaryCard
                label="Letztes Update"
                value={formatDateTime(draft.updatedAt)}
                hint="Zuletzt gespeichert"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="admin-meta-pill !rounded-full !px-3 !py-2 !text-xs">ID {draft.id}</span>
            <span className="admin-meta-pill !rounded-full !px-3 !py-2 !text-xs">/{draft.slug || "kein-slug"}</span>
            <span className="admin-meta-pill !rounded-full !px-3 !py-2 !text-xs">
              <Clock3 className="h-3.5 w-3.5" />
              Aktualisiert {formatDateTime(draft.updatedAt)}
            </span>
            <span className="admin-meta-pill !rounded-full !px-3 !py-2 !text-xs">
              Erstellt {formatDateTime(draft.createdAt)}
            </span>
          </div>
        </header>

        <div className="admin-panel rounded-[1.5rem] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <MetaPill tone={publicationChecklist.isReady ? "success" : "warning"}>
                  {publishStatusLabel}
                </MetaPill>
                <MetaPill tone={publicationChecklist.isReady ? "success" : "neutral"}>
                  {publicationChecklist.completedCount} / {publicationChecklist.totalCount} Kernanforderungen
                </MetaPill>
                {publicationChecklist.extraIssues.length > 0 ? (
                  <MetaPill tone="warning">Weitere Backend-Checks offen</MetaPill>
                ) : null}
              </div>
              <h2 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-slate-950">
                Veroeffentlichungsstatus
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                {publishStatusHint} Titel, Slug, Shop-Zuordnung, aktive Variante, Preis und Bilder werden live im
                Formular markiert.
              </p>
              {publicationChecklist.extraIssues.length > 0 ? (
                <p className="mt-2 text-xs text-amber-700">
                  Weitere aktive Backend-Checks: {publicationChecklist.extraIssues.map((issue) => issue.message).join(" ")}
                </p>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
              <SummaryCard
                label="Kernanforderungen"
                value={`${publicationChecklist.completedCount}/${publicationChecklist.totalCount}`}
                hint={publicationChecklist.isReady ? "Active ist moeglich" : "Active wird noch blockiert"}
              />
              <SummaryCard label="Varianten" value={String(draft.variants.length)} hint="Kaufbare Auspraegungen" />
              <SummaryCard label="Medien" value={String(draft.images.length)} hint="Bilder im Produkt" />
              <SummaryCard label="Optionen" value={String(draft.options.length)} hint="Personalisierungsfelder" />
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {publicationChecklist.items.map((item) => (
              <PublicationRequirementCard key={item.id} item={item} />
            ))}
          </div>
        </div>

        <div className="sticky top-3 z-30 admin-panel rounded-[1.5rem] px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <MetaPill tone={hasUnsavedChanges ? "warning" : "success"}>
                {hasUnsavedChanges ? "Ungespeicherte Aenderungen" : "Alles gespeichert"}
              </MetaPill>
              <MetaPill tone={publicationChecklist.isReady ? "success" : "warning"}>
                {publishStatusLabel}
              </MetaPill>
              <MetaPill tone={draft.status === "active" ? "success" : "neutral"}>
                {draft.status === "active" ? "Im Shop sichtbar" : "Im Shop verborgen"}
              </MetaPill>
              <MetaPill tone={draft.featured ? "warning" : "neutral"}>
                {draft.featured ? "In Bestseller-Leiste" : "Nicht in Bestseller-Leiste"}
              </MetaPill>
              {syncState ? (
                <MetaPill tone={syncState.success ? "success" : "danger"}>
                  {syncState.success ? "Shopify-Sync ok" : "Shopify-Sync Fehler"}
                </MetaPill>
              ) : draft.shopifySyncStatus ? (
                <MetaPill
                  tone={
                    draft.shopifySyncStatus === "synced"
                      ? "success"
                      : draft.shopifySyncStatus === "error"
                        ? "danger"
                        : "warning"
                  }
                >
                  {draft.shopifySyncStatus === "synced"
                    ? "Shopify synchronisiert"
                    : draft.shopifySyncStatus === "error"
                      ? "Shopify Sync-Fehler"
                      : "Shopify Sync offen"}
                </MetaPill>
              ) : null}
              {isSyncing ? (
                <MetaPill tone="warning">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  Sync laeuft
                </MetaPill>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={goToProductList}
                className="admin-action-secondary !px-3.5 !py-2.5 !text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Zur Produktliste
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  void handleShopifySync();
                }}
                className="admin-action-secondary !px-3.5 !py-2.5 !text-sm"
              >
                <Store className="h-4 w-4" />
                {isSyncing
                  ? "Sync laeuft..."
                  : hasUnsavedChanges
                    ? "Speichern und Sync"
                    : "Nach Shopify synchronisieren"}
              </button>
              <AdminDeleteProductButton
                compact
                productId={draft.id}
                productTitle={draft.title}
                onBeforeDelete={() =>
                  confirmNavigation(
                    "Ungespeicherte Aenderungen verwerfen und das Produkt wirklich loeschen?"
                  )
                }
              />
              <button
                type="button"
                disabled={!hasUnsavedChanges || isSaving || isPending}
                onClick={() => {
                  void handleSave();
                }}
                className="admin-action-primary !px-4 !py-2.5 !text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving || isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {isSaving || isPending ? "Speichern..." : "Produkt speichern"}
              </button>
            </div>
          </div>
        </div>

        {saveError || saveMessage || syncError || syncState ? (
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-3">
              {saveError ? <p className="admin-alert admin-alert-error">{saveError}</p> : null}
              {saveMessage ? <p className="admin-alert admin-alert-success">{saveMessage}</p> : null}
              {syncError ? <p className="admin-alert admin-alert-error">{syncError}</p> : null}
            </div>

            {syncState ? (
              <div className="admin-panel rounded-[1.5rem] p-4 text-sm text-slate-600">
                <div className="flex flex-wrap items-center gap-2">
                  <MetaPill tone={syncState.success ? "success" : "danger"}>
                    {syncState.success ? "Shopify-Sync erfolgreich" : "Shopify-Sync fehlgeschlagen"}
                  </MetaPill>
                  {syncState.action ? <MetaPill>{syncState.action}</MetaPill> : null}
                  {typeof syncState.responseStatus === "number" ? <MetaPill>{syncState.responseStatus}</MetaPill> : null}
                </div>
                <div className="mt-3 grid gap-2 text-xs">
                  <p>Shopify Product ID: {syncState.shopifyProductId ?? "-"}</p>
                  <p>Shopify Variant ID: {syncState.shopifyVariantId ?? "-"}</p>
                  <p>Mapping geschrieben: {syncState.mappingWritten ? "ja" : "nein"}</p>
                  <p>Mapping vorhanden: {syncState.mappingExists ? "ja" : "nein"}</p>
                  <p>Token-Quelle: {syncState.tokenSource ?? "-"}</p>
                  <p>Mapping-Pfad: {syncState.mappingPath ?? "-"}</p>
                  {syncState.imageSync ? (
                    <p>
                      Bilder: {syncState.imageSync.syncedCount} synced, {syncState.imageSync.createdCount} neu,{" "}
                      {syncState.imageSync.updatedCount} aktualisiert, {syncState.imageSync.deletedCount} geloescht,{" "}
                      {syncState.imageSync.failedCount} Fehler
                    </p>
                  ) : null}
                  {syncState.error ? <p className="text-rose-700">Fehler: {syncState.error}</p> : null}
                  {syncState.shopifyError ? <p className="text-rose-700">Shopify: {syncState.shopifyError}</p> : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <SectionCard
              id="basic"
              title="Basisdaten"
              hint="Titel, Slug und eine kurze Einordnung fuer die Produktliste."
              icon={<Package2 className="h-4 w-4 text-slate-400" />}
            >
              <PublicationSectionSummary
                title="Pflichtpunkte in den Basisdaten"
                items={[publicationItemsById.title, publicationItemsById.slug]}
                extraIssue={publicationChecklist.extraIssues.find((issue) => issue.field === "shortDescription")?.message}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Titel"
                  publicationStatus={publicationItemsById.title.status}
                  publicationHint={publicationItemsById.title.detail}
                >
                  <CompactInput
                    value={draft.title}
                    onChange={(event) => {
                      const title = event.target.value;
                      setDraft((current) => ({
                        ...current,
                        title,
                        slug: current.slug === slugify(current.title) ? slugify(title) : current.slug
                      }));
                    }}
                    placeholder="Produktname"
                  />
                </Field>

                <Field
                  label="Slug"
                  publicationStatus={publicationItemsById.slug.status}
                  publicationHint={publicationItemsById.slug.detail}
                >
                  <CompactInput
                    value={draft.slug}
                    onChange={(event) => setField("slug", event.target.value)}
                    placeholder="produkt-slug"
                  />
                </Field>

                <Field
                  label="Kurzbeschreibung"
                  className="md:col-span-2"
                  publicationStatus={
                    publicationChecklist.extraIssues.some((issue) => issue.field === "shortDescription")
                      ? "missing"
                      : undefined
                  }
                  publicationHint={
                    publicationChecklist.extraIssues.find((issue) => issue.field === "shortDescription")?.message ??
                    "Wird ebenfalls vor der Veroeffentlichung geprueft."
                  }
                >
                  <AutoResizeTextarea
                    value={draft.shortDescription}
                    onChange={(event) => setField("shortDescription", event.target.value)}
                    minRows={2}
                    placeholder="Kurzer Teaser fuer Shop und Produktliste"
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              id="visibility"
              title="Sichtbarkeit und Status"
              hint="Steuert Shop-Sichtbarkeit, Bestseller-Platzierung, Badge und redaktionelle Kennzahlen."
              icon={<SlidersHorizontal className="h-4 w-4 text-slate-400" />}
              action={
                <MetaPill tone={draft.featured ? "warning" : "neutral"}>
                  {draft.featured ? "Bestseller aktiv" : "Bestseller inaktiv"}
                </MetaPill>
              }
            >
              <div className="grid gap-3 lg:grid-cols-4">
                <Field label="Status">
                  <CompactSelect
                    value={draft.status}
                    onChange={(event) => setField("status", event.target.value as EditableProduct["status"])}
                  >
                    <option value="draft">draft</option>
                    <option value="active">active</option>
                    <option value="archived">archived</option>
                  </CompactSelect>
                </Field>

                <div className="rounded-xl border border-[rgba(148,163,184,0.2)] bg-white/70 px-3.5 py-3 text-sm text-slate-600 md:col-span-2 xl:col-span-2">
                  <p className="font-semibold text-slate-900">Statuswirkung</p>
                  <p className="mt-1">
                    {draft.status === "active"
                      ? "Active veroeffentlicht das Produkt im Shop und synchronisiert den Status zu Shopify."
                      : draft.status === "draft"
                        ? "Draft entfernt das Produkt aus Shop-Listen, Produktseiten und Shopify-Sichtbarkeit."
                        : "Archived haelt das Produkt im Admin, blendet es aber aus dem oeffentlichen Shop aus."}
                  </p>
                  {draft.status === "active" ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Vor dem Speichern werden Titel, Slug, aktive Variante, Preis, Kategoriezuordnung und Bilder geprueft.
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <MetaPill tone={publicationChecklist.isReady ? "success" : "warning"}>
                      {publicationChecklist.completedCount}/{publicationChecklist.totalCount} Kernanforderungen erfuellt
                    </MetaPill>
                    {!publicationChecklist.isReady ? (
                      <MetaPill tone="warning">Active wird aktuell blockiert</MetaPill>
                    ) : null}
                  </div>
                  {draft.shopifySyncError ? (
                    <p className="mt-2 text-xs text-rose-700">Letzter Shopify-Fehler: {draft.shopifySyncError}</p>
                  ) : null}
                  {draft.shopifyLastSyncedAt ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Letzter erfolgreicher Shopify-Sync: {formatDateTime(draft.shopifyLastSyncedAt)}
                    </p>
                  ) : null}
                </div>

                <Field label="Badge">
                  <CompactInput
                    value={draft.badge ?? ""}
                    onChange={(event) => setField("badge", event.target.value || undefined)}
                    placeholder="z. B. Neu"
                  />
                </Field>

                <Field label="Rating">
                  <CompactInput
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={draft.rating}
                    onChange={(event) => setField("rating", Number(event.target.value))}
                  />
                </Field>

                <Field label="Reviews">
                  <CompactInput
                    type="number"
                    min="0"
                    value={draft.reviews}
                    onChange={(event) => setField("reviews", Number(event.target.value))}
                  />
                </Field>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.25rem] border border-[rgba(231,119,44,0.22)] bg-[linear-gradient(180deg,rgba(255,247,237,0.92),rgba(255,255,255,0.96))] px-4 py-4 shadow-[0_12px_30px_-24px_rgba(203,95,23,0.7)] md:col-span-2">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <MetaPill tone={draft.featured ? "warning" : "neutral"}>
                          {draft.featured ? "Aktiv" : "Nicht aktiv"}
                        </MetaPill>
                        <MetaPill tone={draft.status === "active" ? "success" : "warning"}>
                          {draft.status === "active" ? "Status active" : `Status ${draft.status}`}
                        </MetaPill>
                      </div>
                      <p className="mt-3 text-base font-semibold text-slate-950">Bestseller / Beliebtes Produkt</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Diese Markierung steuert direkt den Bereich "Bestseller / Beliebte Produkte" auf der
                        Startseite.
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {draft.featured
                          ? draft.status === "active"
                            ? "Das Produkt ist markiert und wird aktuell auf der Startseite beruecksichtigt."
                            : "Das Produkt ist markiert, bleibt aber unsichtbar, bis der Status auf active steht."
                          : "Ohne Markierung erscheint das Produkt nicht in der Bestseller-Leiste."}
                      </p>
                    </div>

                    <div className="flex flex-col items-stretch gap-2 lg:min-w-[260px]">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          void handleFeaturedToggle();
                        }}
                        className={clsx(
                          "inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                          draft.featured
                            ? "border border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100"
                            : "bg-[var(--brand)] text-white shadow-[0_18px_35px_-24px_rgba(203,95,23,0.9)] hover:bg-[var(--brand-strong)]"
                        )}
                      >
                        {isTogglingFeatured ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Star className={clsx("h-4 w-4", draft.featured && "fill-current")} />
                        )}
                        <span>
                          {isTogglingFeatured
                            ? "Speichert..."
                            : draft.featured
                              ? "Aus Bestsellern entfernen"
                              : "Zu Bestsellern hinzufuegen"}
                        </span>
                      </button>
                      <p className="text-center text-xs text-slate-500">
                        Aendert nur die Bestseller-Markierung und aktualisiert die Shop-Ausgabe sofort.
                      </p>
                    </div>
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-[rgba(148,163,184,0.2)] bg-white/70 px-3.5 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.isPersonalizable}
                    onChange={(event) => setField("isPersonalizable", event.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-semibold text-slate-900">Personalisierbar</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Aktiviert Personalisierungsoptionen auf der Produktseite.
                    </span>
                  </span>
                </label>
              </div>
            </SectionCard>
            <SectionCard
              id="categorization"
              title="Kategorisierung"
              hint="Katalogstruktur, Anlass und Kollektion fuer Shop-Filter und Routing."
              icon={<Layers3 className="h-4 w-4 text-slate-400" />}
            >
              <PublicationSectionSummary
                title="Shop-Zuordnung fuer active"
                items={[publicationItemsById["shop-assignment"]]}
              />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <Field
                  label="Kategorie"
                  publicationStatus={publicationItemsById["shop-assignment"].status}
                  publicationHint={publicationItemsById["shop-assignment"].detail}
                >
                  <CompactInput
                    value={draft.category}
                    onChange={(event) => setField("category", event.target.value)}
                  />
                </Field>

                <Field
                  label="Shop-Kategorie"
                  publicationStatus={publicationItemsById["shop-assignment"].status}
                  publicationHint="Wird fuer Shop-Listen und Routing mitgeprueft."
                >
                  <CompactSelect
                    value={draft.shopCategory}
                    onChange={(event) => setField("shopCategory", event.target.value)}
                  >
                    {shopCategories.map((category) => (
                      <option key={category.slug} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </CompactSelect>
                </Field>

                <Field label="Glasart">
                  <CompactSelect
                    value={draft.glassType}
                    onChange={(event) => setField("glassType", event.target.value)}
                  >
                    {glassTypes.map((glassType) => (
                      <option key={glassType} value={glassType}>
                        {glassType}
                      </option>
                    ))}
                  </CompactSelect>
                </Field>

                <Field label="Anlass">
                  <CompactSelect
                    value={draft.occasion}
                    onChange={(event) => setField("occasion", event.target.value)}
                  >
                    {occasions.map((occasion) => (
                      <option key={occasion} value={occasion}>
                        {occasion}
                      </option>
                    ))}
                  </CompactSelect>
                </Field>

                <Field
                  label="Kollektion"
                  publicationStatus={publicationItemsById["shop-assignment"].status}
                  publicationHint="Kollektion und Slug muessen fuer die Veroeffentlichung gesetzt sein."
                >
                  <CompactSelect
                    value={draft.collectionSlug}
                    onChange={(event) => {
                      const selected = collections.find((entry) => entry.slug === event.target.value);
                      setDraft((current) => ({
                        ...current,
                        collectionSlug: event.target.value,
                        collection: selected?.name ?? current.collection,
                        designer: selected?.creator ?? current.designer
                      }));
                    }}
                  >
                    {collections.map((collection) => (
                      <option key={collection.slug} value={collection.slug}>
                        {collection.name}
                      </option>
                    ))}
                  </CompactSelect>
                </Field>

                <Field
                  label="Kollektionstitel"
                  publicationStatus={publicationItemsById["shop-assignment"].status}
                  publicationHint="Der lesbare Kollektionstitel wird ebenfalls im Backend geprueft."
                >
                  <CompactInput
                    value={draft.collection}
                    onChange={(event) => setField("collection", event.target.value)}
                  />
                </Field>

                <Field label="Designer" className="md:col-span-2 xl:col-span-1">
                  <CompactInput
                    value={draft.designer}
                    onChange={(event) => setField("designer", event.target.value)}
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              id="description"
              title="Beschreibung"
              hint="Lange Beschreibung und seltener genutzte Content-Felder kompakt gruppiert."
              icon={<SlidersHorizontal className="h-4 w-4 text-slate-400" />}
            >
              <div className="grid gap-3">
                <Field label="Lange Beschreibung">
                  <AutoResizeTextarea
                    value={draft.longDescription}
                    onChange={(event) => setField("longDescription", event.target.value)}
                    minRows={6}
                    placeholder="Volle Produktbeschreibung"
                  />
                </Field>

                <details className="group rounded-xl border border-[rgba(148,163,184,0.18)] bg-white/65" open>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 text-sm font-semibold text-slate-900">
                    Erweiterte Inhalte
                    <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
                  </summary>
                  <div className="grid gap-3 border-t border-[rgba(148,163,184,0.14)] px-3.5 py-3">
                    <Field label="Pflegehinweis">
                      <AutoResizeTextarea
                        value={draft.care}
                        onChange={(event) => setField("care", event.target.value)}
                        minRows={2}
                        placeholder="Hinweise fuer Reinigung und Nutzung"
                      />
                    </Field>

                    <Field
                      label="Benefits"
                      hint="Eine Zeile pro Benefit. Wird als Liste gespeichert."
                    >
                      <AutoResizeTextarea
                        value={benefitsText}
                        onChange={(event) => setField("benefits", splitLines(event.target.value))}
                        minRows={3}
                        placeholder={"Benefit 1\nBenefit 2"}
                      />
                    </Field>
                  </div>
                </details>
              </div>
            </SectionCard>

            <SectionCard
              id="variants"
              title="Varianten"
              hint="Primarinfos bleiben sichtbar, Details oeffnen nur bei Bedarf."
              icon={<Package2 className="h-4 w-4 text-slate-400" />}
              action={
                <button
                  type="button"
                  onClick={addVariant}
                  className="admin-action-secondary !px-3.5 !py-2.5 !text-sm"
                >
                  Variante hinzufuegen
                </button>
              }
            >
              <PublicationSectionSummary
                title="Varianten-Checks fuer die Veroeffentlichung"
                items={[publicationItemsById["active-variant"], publicationItemsById.price]}
              />
              {draft.variants.length === 0 ? (
                <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/50 px-4 py-6 text-sm text-rose-700">
                  Noch keine Varianten vorhanden.
                </div>
              ) : (
                <div className="space-y-3">
                  {draft.variants.map((variant, index) => {
                    const isOpen = openVariantIds[variant.id] ?? false;

                    return (
                      <article key={variant.id} className="admin-subpanel rounded-[1.25rem] p-3.5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <button
                            type="button"
                            onClick={() => toggleVariantOpen(variant.id)}
                            className="min-w-0 flex-1 text-left"
                            aria-expanded={isOpen}
                          >
                            <div className="flex items-center gap-2">
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                              )}
                              <p className="truncate text-sm font-semibold text-slate-950">
                                {variant.name || `Variante ${index + 1}`}
                              </p>
                              {draft.defaultVariantId === variant.id ? (
                                <MetaPill tone="success">Default</MetaPill>
                              ) : null}
                              {variant.id === publicationVariant?.id ? (
                                <MetaPill tone={getPublicationStatusTone(publicationItemsById.price.status)}>
                                  Publikationsvariante
                                </MetaPill>
                              ) : null}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span>SKU {variant.sku || "-"}</span>
                              <span>&middot;</span>
                              <span>{formatMoneyFromCents(variant.priceCents)}</span>
                              <span>&middot;</span>
                              <span>{getStockSummary(variant)}</span>
                            </div>
                          </button>

                          <div className="flex flex-wrap items-center gap-2">
                            <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                              <input
                                type="radio"
                                name="defaultVariant"
                                checked={draft.defaultVariantId === variant.id}
                                onChange={() => setField("defaultVariantId", variant.id)}
                              />
                              Standard
                            </label>
                            <label
                              className={clsx(
                                "inline-flex items-center gap-2 rounded-full border bg-white px-3 py-2 text-xs font-semibold",
                                variant.isActive
                                  ? "border-emerald-200 text-emerald-700"
                                  : "border-rose-200 text-rose-700"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={variant.isActive}
                                onChange={(event) =>
                                  updateVariant(variant.id, (entry) => ({
                                    ...entry,
                                    isActive: event.target.checked
                                  }))
                                }
                              />
                              Aktiv
                            </label>
                            <MetaPill tone={getStockTone(variant)}>{getStockSummary(variant)}</MetaPill>
                            <button
                              type="button"
                              onClick={() => removeVariant(variant.id)}
                              className="admin-action-danger !px-3 !py-2 !text-sm"
                            >
                              Entfernen
                            </button>
                          </div>
                        </div>

                        {isOpen ? (
                          <div className="mt-3 grid gap-3 border-t border-[rgba(148,163,184,0.14)] pt-3 md:grid-cols-2 xl:grid-cols-4">
                            <Field label="Name">
                              <CompactInput
                                value={variant.name}
                                onChange={(event) =>
                                  updateVariant(variant.id, (entry) => ({
                                    ...entry,
                                    name: event.target.value
                                  }))
                                }
                              />
                            </Field>

                            <Field
                              label="SKU"
                              publicationStatus={
                                variant.id === publicationVariant?.id && variant.isActive
                                  ? publicationItemsById.price.status === "complete"
                                    ? "complete"
                                    : variant.sku.trim()
                                      ? "complete"
                                      : "missing"
                                  : undefined
                              }
                              publicationHint={
                                variant.id === publicationVariant?.id && variant.isActive
                                  ? variant.sku.trim()
                                    ? "SKU fuer die Veroeffentlichungsvariante vorhanden."
                                    : "Die Veroeffentlichungsvariante benoetigt eine SKU."
                                  : undefined
                              }
                            >
                              <CompactInput
                                value={variant.sku}
                                onChange={(event) =>
                                  updateVariant(variant.id, (entry) => ({
                                    ...entry,
                                    sku: event.target.value
                                  }))
                                }
                              />
                            </Field>

                            <Field
                              label="Preis in Cent"
                              publicationStatus={
                                variant.id === publicationVariant?.id && variant.isActive
                                  ? variant.priceCents > 0
                                    ? publicationItemsById.price.status === "incomplete"
                                      ? "incomplete"
                                      : "complete"
                                    : "missing"
                                  : undefined
                              }
                              publicationHint={
                                variant.id === publicationVariant?.id && variant.isActive
                                  ? variant.priceCents > 0
                                    ? publicationItemsById.price.detail
                                    : "Die Veroeffentlichungsvariante benoetigt einen Preis groesser 0."
                                  : undefined
                              }
                            >
                              <CompactInput
                                type="number"
                                min="0"
                                value={variant.priceCents}
                                onChange={(event) =>
                                  updateVariant(variant.id, (entry) => ({
                                    ...entry,
                                    priceCents: Number(event.target.value)
                                  }))
                                }
                              />
                            </Field>

                            <Field label="Vergleichspreis in Cent">
                              <CompactInput
                                type="number"
                                min="0"
                                value={variant.compareAtPriceCents ?? ""}
                                onChange={(event) =>
                                  updateVariant(variant.id, (entry) => ({
                                    ...entry,
                                    compareAtPriceCents: asOptionalNumber(event.target.value)
                                  }))
                                }
                              />
                            </Field>

                            <Field label="Lager-Modus">
                              <CompactSelect
                                value={variant.stockMode}
                                onChange={(event) =>
                                  updateVariant(variant.id, (entry) => ({
                                    ...entry,
                                    stockMode: event.target.value as EditableVariant["stockMode"],
                                    stockQuantity:
                                      event.target.value === "tracked" ? entry.stockQuantity ?? 0 : undefined
                                  }))
                                }
                              >
                                <option value="unlimited">unlimited</option>
                                <option value="tracked">tracked</option>
                                <option value="made_to_order">made_to_order</option>
                              </CompactSelect>
                            </Field>

                            <Field label="Lagerbestand">
                              <CompactInput
                                type="number"
                                min="0"
                                disabled={variant.stockMode !== "tracked"}
                                value={variant.stockQuantity ?? ""}
                                onChange={(event) =>
                                  updateVariant(variant.id, (entry) => ({
                                    ...entry,
                                    stockQuantity: asOptionalNumber(event.target.value)
                                  }))
                                }
                              />
                            </Field>

                            <Field label="Produktionstage">
                              <CompactInput
                                type="number"
                                min="0"
                                value={variant.productionTimeDays}
                                onChange={(event) =>
                                  updateVariant(variant.id, (entry) => ({
                                    ...entry,
                                    productionTimeDays: Number(event.target.value)
                                  }))
                                }
                              />
                            </Field>

                            <Field label="Gewicht in Gramm">
                              <CompactInput
                                type="number"
                                min="0"
                                value={variant.weightGrams ?? ""}
                                onChange={(event) =>
                                  updateVariant(variant.id, (entry) => ({
                                    ...entry,
                                    weightGrams: asOptionalNumber(event.target.value)
                                  }))
                                }
                              />
                            </Field>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </SectionCard>
            <SectionCard
              id="media"
              title="Medien und Bilder"
              hint="Direkter Upload-Workflow mit Backend-Speicherung, Bildstatus und Shopify-Abgleich."
              icon={<ImageIcon className="h-4 w-4 text-slate-400" />}
            >
              <PublicationSectionSummary
                title="Bildanforderung fuer active"
                items={[publicationItemsById.images]}
              />
              <AdminProductImageManager
                productId={draft.id}
                productTitle={draft.title}
                images={draft.images}
                isBusy={isBusy}
                isSyncing={isSyncing}
                onImagesPersisted={(images) => replacePersistedImages(images, { clearSyncState: true })}
                onRetryShopifySync={handleShopifySync}
              />
            </SectionCard>

            <SectionCard
              id="personalization"
              title="Personalisierungsoptionen"
              hint="Optionen bleiben kompakt, Select-Werte oeffnen nur bei Bedarf."
              icon={<SlidersHorizontal className="h-4 w-4 text-slate-400" />}
              action={
                <button
                  type="button"
                  onClick={addOption}
                  className="admin-action-secondary !px-3.5 !py-2.5 !text-sm"
                >
                  Option hinzufuegen
                </button>
              }
            >
              {draft.options.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[rgba(148,163,184,0.24)] bg-white/60 px-4 py-6 text-sm text-slate-500">
                  Noch keine Personalisierungsoptionen vorhanden.
                </div>
              ) : (
                <div className="space-y-3">
                  {draft.options.map((option, optionIndex) => {
                    const isOpen = openOptionIds[option.id] ?? false;

                    return (
                      <article key={option.id} className="admin-subpanel rounded-[1.25rem] p-3.5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <button
                            type="button"
                            onClick={() => toggleOptionOpen(option.id)}
                            className="min-w-0 flex-1 text-left"
                            aria-expanded={isOpen}
                          >
                            <div className="flex items-center gap-2">
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                              )}
                              <p className="truncate text-sm font-semibold text-slate-950">
                                {option.name || `Option ${optionIndex + 1}`}
                              </p>
                              <MetaPill tone={option.isActive ? "success" : "neutral"}>
                                {option.isActive ? "Aktiv" : "Inaktiv"}
                              </MetaPill>
                              {option.isRequired ? <MetaPill tone="warning">Pflicht</MetaPill> : null}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span>{option.code || "kein-code"}</span>
                              <span>&middot;</span>
                              <span>{option.type}</span>
                              <span>&middot;</span>
                              <span>{option.values.length} Werte</span>
                            </div>
                          </button>

                          <div className="flex flex-wrap items-center gap-2">
                            <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                              <input
                                type="checkbox"
                                checked={option.isRequired}
                                onChange={(event) =>
                                  updateOption(option.id, (entry) => ({
                                    ...entry,
                                    isRequired: event.target.checked
                                  }))
                                }
                              />
                              Pflicht
                            </label>
                            <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                              <input
                                type="checkbox"
                                checked={option.isActive}
                                onChange={(event) =>
                                  updateOption(option.id, (entry) => ({
                                    ...entry,
                                    isActive: event.target.checked
                                  }))
                                }
                              />
                              Aktiv
                            </label>
                            <button
                              type="button"
                              onClick={() => removeOption(option.id)}
                              className="admin-action-danger !px-3 !py-2 !text-sm"
                            >
                              Entfernen
                            </button>
                          </div>
                        </div>

                        {isOpen ? (
                          <div className="mt-3 space-y-3 border-t border-[rgba(148,163,184,0.14)] pt-3">
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                              <Field label="Name">
                                <CompactInput
                                  value={option.name}
                                  onChange={(event) =>
                                    updateOption(option.id, (entry) => ({
                                      ...entry,
                                      name: event.target.value,
                                      code: entry.code === slugify(entry.name) ? slugify(event.target.value) : entry.code
                                    }))
                                  }
                                />
                              </Field>

                              <Field label="Code">
                                <CompactInput
                                  value={option.code}
                                  onChange={(event) =>
                                    updateOption(option.id, (entry) => ({
                                      ...entry,
                                      code: event.target.value
                                    }))
                                  }
                                />
                              </Field>

                              <Field label="Typ">
                                <CompactSelect
                                  value={option.type}
                                  onChange={(event) =>
                                    updateOption(option.id, (entry) => ({
                                      ...entry,
                                      type: event.target.value as EditableOption["type"],
                                      values:
                                        event.target.value === "select"
                                          ? entry.values.length > 0
                                            ? entry.values
                                            : [
                                                {
                                                  id: createId("value"),
                                                  label: "Option 1",
                                                  value: "option-1",
                                                  sortOrder: 0,
                                                  priceModifierCents: 0,
                                                  isActive: true
                                                }
                                              ]
                                          : []
                                    }))
                                  }
                                >
                                  <option value="text">text</option>
                                  <option value="textarea">textarea</option>
                                  <option value="select">select</option>
                                  <option value="checkbox">checkbox</option>
                                  <option value="file">file</option>
                                </CompactSelect>
                              </Field>

                              <Field label="Pricing-Modus">
                                <CompactSelect
                                  value={option.pricingMode}
                                  onChange={(event) =>
                                    updateOption(option.id, (entry) => ({
                                      ...entry,
                                      pricingMode: event.target.value as EditableOption["pricingMode"]
                                    }))
                                  }
                                >
                                  <option value="none">none</option>
                                  <option value="fixed">fixed</option>
                                  <option value="per_character">per_character</option>
                                </CompactSelect>
                              </Field>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                              <Field label="Placeholder">
                                <CompactInput
                                  value={option.placeholder ?? ""}
                                  onChange={(event) =>
                                    updateOption(option.id, (entry) => ({
                                      ...entry,
                                      placeholder: event.target.value || undefined
                                    }))
                                  }
                                />
                              </Field>

                              <Field label="Max-Length">
                                <CompactInput
                                  type="number"
                                  min="0"
                                  value={option.maxLength ?? ""}
                                  onChange={(event) =>
                                    updateOption(option.id, (entry) => ({
                                      ...entry,
                                      maxLength: asOptionalNumber(event.target.value)
                                    }))
                                  }
                                />
                              </Field>

                              <Field label="Preisaufschlag in Cent">
                                <CompactInput
                                  type="number"
                                  value={option.priceModifierCents ?? 0}
                                  onChange={(event) =>
                                    updateOption(option.id, (entry) => ({
                                      ...entry,
                                      priceModifierCents: Number(event.target.value)
                                    }))
                                  }
                                />
                              </Field>

                              <Field label="Erlaubte MIME-Typen">
                                <CompactInput
                                  value={joinCommaList(option.acceptedMimeTypes)}
                                  onChange={(event) =>
                                    updateOption(option.id, (entry) => ({
                                      ...entry,
                                      acceptedMimeTypes: splitCommaList(event.target.value)
                                    }))
                                  }
                                  placeholder="image/png, image/jpeg"
                                />
                              </Field>
                            </div>

                            <Field label="Hilfetext">
                              <CompactInput
                                value={option.helpText ?? ""}
                                onChange={(event) =>
                                  updateOption(option.id, (entry) => ({
                                    ...entry,
                                    helpText: event.target.value || undefined
                                  }))
                                }
                                placeholder="Optionaler Hilfetext"
                              />
                            </Field>

                            {option.type === "select" ? (
                              <div className="rounded-xl border border-[rgba(148,163,184,0.18)] bg-white/65 px-3.5 py-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-950">Select-Werte</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      Kompakt pflegen und nur aktive Werte publizieren.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => addSelectValue(option.id)}
                                    className="admin-action-secondary !px-3 !py-2 !text-sm"
                                  >
                                    Wert hinzufuegen
                                  </button>
                                </div>

                                <div className="mt-3 space-y-2">
                                  {option.values.map((value) => (
                                    <div
                                      key={value.id}
                                      className="grid gap-2 rounded-xl border border-[rgba(148,163,184,0.16)] bg-white px-3 py-3 lg:grid-cols-[1fr_1fr_160px_auto_auto]"
                                    >
                                      <CompactInput
                                        value={value.label}
                                        onChange={(event) =>
                                          updateOptionValue(option.id, value.id, (entry) => ({
                                            ...entry,
                                            label: event.target.value
                                          }))
                                        }
                                        placeholder="Label"
                                      />
                                      <CompactInput
                                        value={value.value}
                                        onChange={(event) =>
                                          updateOptionValue(option.id, value.id, (entry) => ({
                                            ...entry,
                                            value: event.target.value
                                          }))
                                        }
                                        placeholder="Wert"
                                      />
                                      <CompactInput
                                        type="number"
                                        value={value.priceModifierCents ?? 0}
                                        onChange={(event) =>
                                          updateOptionValue(option.id, value.id, (entry) => ({
                                            ...entry,
                                            priceModifierCents: Number(event.target.value)
                                          }))
                                        }
                                      />
                                      <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                                        <input
                                          type="checkbox"
                                          checked={value.isActive}
                                          onChange={(event) =>
                                            updateOptionValue(option.id, value.id, (entry) => ({
                                              ...entry,
                                              isActive: event.target.checked
                                            }))
                                          }
                                        />
                                        Aktiv
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => removeSelectValue(option.id, value.id)}
                                        className="admin-action-danger !px-3 !py-2 !text-sm"
                                      >
                                        Entfernen
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          <aside className="hidden xl:block">
            <div className="sticky top-28 space-y-3">
              <div className="admin-panel rounded-[1.5rem] p-4">
                <p className="text-sm font-semibold text-slate-950">Workflow-Status</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <div className="flex items-start gap-2">
                    {publicationChecklist.isReady ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                    ) : (
                      <TriangleAlert className="mt-0.5 h-4 w-4 text-amber-500" />
                    )}
                    <span>
                      {publicationChecklist.isReady
                        ? "Produkt ist aktuell bereit fuer active."
                        : `${publicationChecklist.completedCount} von ${publicationChecklist.totalCount} Kernanforderungen sind erfuellt.`}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    {hasUnsavedChanges ? (
                      <TriangleAlert className="mt-0.5 h-4 w-4 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                    )}
                    <span>
                      {hasUnsavedChanges
                        ? "Es gibt ungespeicherte Aenderungen."
                        : "Formular und gespeicherter Stand sind synchron."}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Store className="mt-0.5 h-4 w-4 text-slate-400" />
                    <span>
                      {hasUnsavedChanges
                        ? "Shopify-Sync speichert Aenderungen zuerst."
                        : "Shopify-Sync arbeitet mit dem zuletzt gespeicherten Stand."}
                    </span>
                  </div>
                  {!publicationChecklist.isReady ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-800">
                      Offen:{" "}
                      {publicationChecklist.items
                        .filter((item) => item.status !== "complete")
                        .map((item) => item.label)
                        .join(", ")}
                      {publicationChecklist.extraIssues.length > 0
                        ? ` | Weitere Checks: ${publicationChecklist.extraIssues.map((issue) => issue.message).join(" ")}`
                        : ""}
                    </div>
                  ) : null}
                </div>
              </div>

              <SidebarNav sections={sectionLinks} />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
