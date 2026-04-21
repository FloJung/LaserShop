"use client";

import clsx from "clsx";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ImageIcon,
  Layers3,
  LoaderCircle,
  Package2,
  Plus,
  Save,
  SlidersHorizontal,
  Star,
  Store,
  Trash2
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
import {
  getProductPublicationChecklist,
  type ProductPublicationChecklistItem,
  type ProductPublicationChecklistStatus
} from "@/shared/catalog/publication";
import type { ProductTaxonomyKind } from "@/shared/catalog";

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
  categoryId?: string;
  shopCategory: string;
  shopCategoryId?: string;
  glassType: string;
  glassTypeId?: string;
  collection: string;
  collectionId?: string;
  collectionSlug: string;
  designer: string;
  designerId?: string;
  occasion: string;
  occasionId?: string;
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

type EditableTaxonomyOption = {
  id: string;
  kind: ProductTaxonomyKind;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type EditableTaxonomyCatalog = Record<ProductTaxonomyKind, EditableTaxonomyOption[]>;

type AdminProductEditorProps = {
  product: EditableProduct;
  taxonomies: EditableTaxonomyCatalog;
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

const compactFieldClassName = "admin-field !min-h-[2rem] !rounded-none !px-2 !py-1.5 !text-sm !shadow-none";
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
        "inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
        tone === "success" && "border-emerald-300 bg-emerald-50 text-emerald-700",
        tone === "warning" && "border-amber-300 bg-amber-50 text-amber-700",
        tone === "danger" && "border-rose-300 bg-rose-50 text-rose-700",
        tone === "neutral" && "border-slate-300 bg-white text-slate-600"
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
  plain = false,
  className,
  children
}: {
  label: string;
  hint?: string;
  publicationStatus?: ProductPublicationChecklistStatus;
  publicationHint?: string;
  plain?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const hasPublicationState = Boolean(publicationStatus);
  const helperText = publicationHint ?? hint;
  const publicationTone = publicationStatus ? getPublicationStatusTone(publicationStatus) : undefined;

  return (
    <label className={clsx("grid gap-1.5", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">{label}</span>
        {publicationTone ? (
          <MetaPill tone={publicationTone}>
            required
          </MetaPill>
        ) : null}
      </div>
      <div
        className={clsx(
          !plain && hasPublicationState && "rounded-[1rem] border px-2.5 py-2",
          !plain && publicationStatus === "complete" && "border-emerald-200 bg-emerald-50/45",
          !plain && publicationStatus === "incomplete" && "border-amber-200 bg-amber-50/45",
          !plain && publicationStatus === "missing" && "border-rose-200 bg-rose-50/45"
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
    <section id={id} className="scroll-mt-28 admin-panel">
      <div className="mb-2 flex flex-col gap-1 border-b border-slate-300 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {icon}
            <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
          </div>
          {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
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
        "border px-2 py-1.5",
        item.status === "complete" && "border-emerald-300 bg-emerald-50/55",
        item.status === "incomplete" && "border-amber-300 bg-amber-50/55",
        item.status === "missing" && "border-rose-300 bg-rose-50/55"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-950">{item.label}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{item.description}</p>
        </div>
        <MetaPill tone={getPublicationStatusTone(item.status)}>{getPublicationStatusLabel(item.status)}</MetaPill>
      </div>
      <p
        className={clsx(
          "mt-1 text-[11px] leading-4",
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
    <div className="mb-2 border border-slate-300 bg-slate-50 px-2 py-1.5">
      <div className="flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-950">{title}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
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
      {extraIssue ? <p className="mt-1 text-[11px] text-amber-700">Zusaetzlicher Backend-Check: {extraIssue}</p> : null}
    </div>
  );
}

function normalizeTaxonomyOptions(options: EditableTaxonomyOption[]) {
  return [...options].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "de"));
}

function ManagedTaxonomySelect({
  label,
  publicationStatus,
  publicationHint,
  selectedId,
  options,
  isBusy,
  newValue,
  onSelect,
  onNewValueChange,
  onCreate,
  onRenameValueChange,
  getRenameValue,
  onRename,
  onDelete,
  helperText,
  className
}: {
  label: string;
  publicationStatus?: ProductPublicationChecklistStatus;
  publicationHint?: string;
  selectedId?: string;
  options: EditableTaxonomyOption[];
  isBusy: boolean;
  newValue: string;
  onSelect: (id: string) => void;
  onNewValueChange: (value: string) => void;
  onCreate: () => void | Promise<void>;
  onRenameValueChange: (taxonomyId: string, value: string) => void;
  getRenameValue: (taxonomyId: string, fallback: string) => string;
  onRename: (taxonomyId: string) => void | Promise<void>;
  onDelete: (taxonomyId: string) => void | Promise<void>;
  helperText?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.id === selectedId) ?? null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target || containerRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
      setEditingId(null);
      setIsAdding(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setIsOpen(false);
      setEditingId(null);
      setIsAdding(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  async function handleCreate() {
    if (!newValue.trim()) {
      return;
    }

    await onCreate();
    setIsAdding(false);
  }

  async function handleRename(taxonomyId: string) {
    const option = options.find((entry) => entry.id === taxonomyId);
    const nextValue = getRenameValue(taxonomyId, option?.name ?? "");
    if (!nextValue.trim()) {
      return;
    }

    await onRename(taxonomyId);
    setEditingId(null);
  }

  async function handleDelete(taxonomyId: string) {
    await onDelete(taxonomyId);
    if (editingId === taxonomyId) {
      setEditingId(null);
    }
  }

  return (
    <Field
      label={label}
      publicationStatus={publicationStatus}
      publicationHint={publicationHint ?? helperText}
      plain
      className={className}
    >
      <div ref={containerRef} className="relative">
        <button
          type="button"
          disabled={isBusy}
          aria-expanded={isOpen}
          onClick={() => {
            setIsOpen((current) => !current);
            if (isOpen) {
              setEditingId(null);
              setIsAdding(false);
            }
          }}
          className="flex h-8 w-full items-center justify-between border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-slate-900"
        >
          <span className="truncate text-left">{selectedOption?.name ?? "Nicht gesetzt"}</span>
          <ChevronDown className={clsx("h-3.5 w-3.5 shrink-0 text-slate-500", isOpen && "rotate-180")} />
        </button>

        {isOpen ? (
          <div className="absolute left-0 right-0 top-full z-20 border border-t-0 border-slate-300 bg-white">
            <div className="max-h-56 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  onSelect("");
                  setIsOpen(false);
                  setEditingId(null);
                  setIsAdding(false);
                }}
                className={clsx(
                  "flex h-8 w-full items-center px-2 text-left text-sm",
                  !selectedId && "bg-slate-100 font-medium",
                  selectedId && "hover:bg-slate-50"
                )}
              >
                Nicht gesetzt
              </button>

              {normalizeTaxonomyOptions(options).map((option) => {
                const isEditing = editingId === option.id;
                const renameValue = getRenameValue(option.id, option.name);

                return (
                  <div
                    key={option.id}
                    className={clsx(
                      "grid min-h-8 grid-cols-[minmax(0,1fr)_28px_28px] border-t border-slate-300",
                      selectedId === option.id && !isEditing && "bg-slate-100"
                    )}
                  >
                    {isEditing ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(event) => onRenameValueChange(option.id, event.target.value)}
                        disabled={isBusy}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleRename(option.id);
                          }

                          if (event.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                        className="min-w-0 border-0 px-2 text-sm text-slate-900 outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(option.id);
                          setIsOpen(false);
                          setEditingId(null);
                          setIsAdding(false);
                        }}
                        className="truncate px-2 text-left text-sm hover:bg-slate-50"
                      >
                        {option.name}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (isEditing) {
                          void handleRename(option.id);
                          return;
                        }

                        setEditingId(option.id);
                        setIsAdding(false);
                      }}
                      title={isEditing ? "Speichern" : "Bearbeiten"}
                      aria-label={isEditing ? `${label} speichern` : `${label} bearbeiten`}
                      className="flex h-7 w-7 items-center justify-center border-l border-slate-300 text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
                      disabled={isBusy || (isEditing && !renameValue.trim())}
                    >
                      <Save className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void handleDelete(option.id);
                      }}
                      title="Loeschen"
                      aria-label={`${label} loeschen`}
                      className="flex h-7 w-7 items-center justify-center border-l border-slate-300 text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
                      disabled={isBusy}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}

              {isAdding ? (
                <div className="grid min-h-8 grid-cols-[minmax(0,1fr)_28px] border-t border-slate-300">
                  <input
                    autoFocus
                    value={newValue}
                    onChange={(event) => onNewValueChange(event.target.value)}
                    placeholder={`${label} hinzufuegen`}
                    disabled={isBusy}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleCreate();
                      }

                      if (event.key === "Escape") {
                        setIsAdding(false);
                      }
                    }}
                    className="min-w-0 border-0 px-2 text-sm text-slate-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void handleCreate();
                    }}
                    title="Hinzufuegen"
                    aria-label={`${label} hinzufuegen`}
                    className="flex h-7 w-7 items-center justify-center border-l border-slate-300 text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
                    disabled={isBusy || !newValue.trim()}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(true);
                    setEditingId(null);
                  }}
                  className="flex h-8 w-full items-center border-t border-slate-300 px-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  disabled={isBusy}
                >
                  + Hinzufuegen
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </Field>
  );
}

export function AdminProductEditor({ product, taxonomies }: AdminProductEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(product);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(product));
  const [taxonomyCatalog, setTaxonomyCatalog] = useState(taxonomies);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [taxonomyMessage, setTaxonomyMessage] = useState<string | null>(null);
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
  const [newTaxonomyValues, setNewTaxonomyValues] = useState<Record<ProductTaxonomyKind, string>>({
    category: "",
    shopCategory: "",
    glassType: "",
    occasion: "",
    collection: "",
    designer: ""
  });
  const [taxonomyRenameValues, setTaxonomyRenameValues] = useState<Record<string, string>>({});
  const [taxonomyBusyKey, setTaxonomyBusyKey] = useState<string | null>(null);
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
  const activeVariants = draft.variants.filter((variant) => variant.isActive);
  const publicationVariant =
    draft.variants.find((variant) => variant.id === draft.defaultVariantId && variant.isActive) ??
    activeVariants[0] ??
    draft.variants[0];

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

  function applyDraftTaxonomy(kind: ProductTaxonomyKind, selected: EditableTaxonomyOption | null) {
    setDraft((current) => {
      if (kind === "category") {
        return {
          ...current,
          category: selected?.name ?? "",
          categoryId: selected?.id,
          ...(selected ? {} : { status: "draft" as const })
        };
      }

      if (kind === "shopCategory") {
        return {
          ...current,
          shopCategory: selected?.slug ?? "",
          shopCategoryId: selected?.id,
          ...(selected ? {} : { status: "draft" as const })
        };
      }

      if (kind === "glassType") {
        return {
          ...current,
          glassType: selected?.name ?? "",
          glassTypeId: selected?.id,
          ...(selected ? {} : { status: "draft" as const })
        };
      }

      if (kind === "occasion") {
        return {
          ...current,
          occasion: selected?.name ?? "",
          occasionId: selected?.id,
          ...(selected ? {} : { status: "draft" as const })
        };
      }

      if (kind === "collection") {
        return {
          ...current,
          collection: selected?.name ?? "",
          collectionId: selected?.id,
          collectionSlug: selected?.slug ?? "",
          ...(selected ? {} : { status: "draft" as const })
        };
      }

      return {
        ...current,
        designer: selected?.name ?? "",
        designerId: selected?.id,
        ...(selected ? {} : { status: "draft" as const })
      };
    });
  }

  function updateDraftTaxonomy(kind: ProductTaxonomyKind, taxonomyId: string) {
    const selected = taxonomyCatalog[kind].find((entry) => entry.id === taxonomyId) ?? null;
    applyDraftTaxonomy(kind, selected);
  }

  function getSelectedTaxonomyId(kind: ProductTaxonomyKind) {
    if (kind === "category") {
      return draft.categoryId;
    }

    if (kind === "shopCategory") {
      return draft.shopCategoryId;
    }

    if (kind === "glassType") {
      return draft.glassTypeId;
    }

    if (kind === "occasion") {
      return draft.occasionId;
    }

    if (kind === "collection") {
      return draft.collectionId;
    }

    return draft.designerId;
  }

  function getTaxonomyLabel(kind: ProductTaxonomyKind) {
    if (kind === "category") {
      return "Kategorie";
    }

    if (kind === "shopCategory") {
      return "Shop-Kategorie";
    }

    if (kind === "glassType") {
      return "Glasart";
    }

    if (kind === "occasion") {
      return "Anlass";
    }

    if (kind === "collection") {
      return "Kollektion";
    }

    return "Designer";
  }

  function setNewTaxonomyValue(kind: ProductTaxonomyKind, value: string) {
    setNewTaxonomyValues((current) => ({
      ...current,
      [kind]: value
    }));
  }

  function getTaxonomyRenameValue(taxonomyId: string, fallback: string) {
    return taxonomyRenameValues[taxonomyId] ?? fallback;
  }

  async function createTaxonomy(kind: ProductTaxonomyKind) {
    setSaveError(null);
    setSaveMessage(null);
    setTaxonomyMessage(null);
    setTaxonomyBusyKey(`${kind}:create`);

    try {
      const response = await fetch("/api/admin/product-taxonomies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          kind,
          name: newTaxonomyValues[kind]
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            taxonomy?: EditableTaxonomyOption;
            message?: string;
            error?: string;
          }
        | null;

      if (!response.ok || !payload?.taxonomy) {
        setSaveError(payload?.error ?? `${getTaxonomyLabel(kind)} konnte nicht hinzugefuegt werden.`);
        return;
      }

      setTaxonomyCatalog((current) => ({
        ...current,
        [kind]: normalizeTaxonomyOptions([...current[kind], payload.taxonomy!])
      }));
      applyDraftTaxonomy(kind, payload.taxonomy);
      setNewTaxonomyValue(kind, "");
      setTaxonomyMessage(payload.message ?? `${getTaxonomyLabel(kind)} hinzugefuegt.`);
    } finally {
      setTaxonomyBusyKey(null);
    }
  }

  async function renameTaxonomy(kind: ProductTaxonomyKind, taxonomyId: string) {
    setSaveError(null);
    setSaveMessage(null);
    setTaxonomyMessage(null);
    setTaxonomyBusyKey(`${kind}:rename:${taxonomyId}`);

    try {
      const response = await fetch(`/api/admin/product-taxonomies/${kind}/${taxonomyId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: getTaxonomyRenameValue(
            taxonomyId,
            taxonomyCatalog[kind].find((entry) => entry.id === taxonomyId)?.name ?? ""
          )
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            taxonomy?: EditableTaxonomyOption;
            affectedProductIds?: string[];
            message?: string;
            error?: string;
          }
        | null;

      if (!response.ok || !payload?.taxonomy) {
        setSaveError(payload?.error ?? `${getTaxonomyLabel(kind)} konnte nicht aktualisiert werden.`);
        return;
      }

      setTaxonomyCatalog((current) => ({
        ...current,
        [kind]: normalizeTaxonomyOptions(
          current[kind].map((entry) => (entry.id === taxonomyId ? payload.taxonomy! : entry))
        )
      }));
      if (getSelectedTaxonomyId(kind) === taxonomyId) {
        applyDraftTaxonomy(kind, payload.taxonomy);
      }

      setTaxonomyMessage(
        payload.message ??
          `${getTaxonomyLabel(kind)} aktualisiert. ${payload.affectedProductIds?.length ?? 0} Produkte global angepasst.`
      );
    } finally {
      setTaxonomyBusyKey(null);
    }
  }

  async function deleteTaxonomy(kind: ProductTaxonomyKind, taxonomyId: string) {
    const taxonomy = taxonomyCatalog[kind].find((entry) => entry.id === taxonomyId);
    if (!taxonomy) {
      return;
    }

    const confirmed = window.confirm(
      `Bist du sicher, dass du diese ${getTaxonomyLabel(kind)} loeschen moechtest?\nAlle betroffenen Produkte werden angepasst und auf Draft gesetzt.`
    );
    if (!confirmed) {
      return;
    }

    setSaveError(null);
    setSaveMessage(null);
    setTaxonomyMessage(null);
    setTaxonomyBusyKey(`${kind}:delete:${taxonomyId}`);

    try {
      const response = await fetch(`/api/admin/product-taxonomies/${kind}/${taxonomyId}`, {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            draftedProductIds?: string[];
            message?: string;
            error?: string;
          }
        | null;

      if (!response.ok) {
        setSaveError(payload?.error ?? `${getTaxonomyLabel(kind)} konnte nicht geloescht werden.`);
        return;
      }

      setTaxonomyCatalog((current) => ({
        ...current,
        [kind]: current[kind].filter((entry) => entry.id !== taxonomyId)
      }));

      if (getSelectedTaxonomyId(kind) === taxonomyId) {
        applyDraftTaxonomy(kind, null);
      }

      setTaxonomyMessage(
        payload?.message ??
          `${getTaxonomyLabel(kind)} geloescht. ${payload?.draftedProductIds?.length ?? 0} Produkte wurden auf Draft gesetzt.`
      );
    } finally {
      setTaxonomyBusyKey(null);
    }
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
    setTaxonomyMessage(null);
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
    setTaxonomyMessage(null);
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
    setTaxonomyMessage(null);
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
      <div className="shell admin-editor space-y-2">
        <header className="admin-panel">
          <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_150px_auto] xl:items-end">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Produkt</p>
              <p className="truncate text-base font-semibold text-slate-950">{draft.title || "Unbenanntes Produkt"}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                <MetaPill tone={hasUnsavedChanges ? "warning" : "success"}>
                  {hasUnsavedChanges ? "unsaved" : "saved"}
                </MetaPill>
                <MetaPill tone={publicationChecklist.isReady ? "success" : "warning"}>{publishStatusLabel}</MetaPill>
                <MetaPill tone={draft.shopifySyncStatus === "error" ? "danger" : draft.shopifySyncStatus === "synced" ? "success" : "neutral"}>
                  Shopify {draft.shopifySyncStatus ?? "offen"}
                </MetaPill>
                <MetaPill>ID {draft.id}</MetaPill>
                <MetaPill>/{draft.slug || "kein-slug"}</MetaPill>
              </div>
            </div>

            <Field label="Status" plain>
              <CompactSelect
                value={draft.status}
                onChange={(event) => setField("status", event.target.value as EditableProduct["status"])}
              >
                <option value="draft">draft</option>
                <option value="active">active</option>
                <option value="archived">archived</option>
              </CompactSelect>
            </Field>

            <div className="flex flex-wrap items-center gap-1">
              <button type="button" onClick={goToProductList} className="admin-action-secondary">
                <ArrowLeft className="h-3.5 w-3.5" />
                Liste
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  void handleShopifySync();
                }}
                className="admin-action-secondary"
              >
                <Store className="h-3.5 w-3.5" />
                Sync
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  void handleFeaturedToggle();
                }}
                className="admin-action-secondary"
              >
                <Star className={clsx("h-3.5 w-3.5", draft.featured && "fill-current")} />
                Featured
              </button>
              <AdminDeleteProductButton
                compact
                productId={draft.id}
                productTitle={draft.title}
                onBeforeDelete={() =>
                  confirmNavigation("Ungespeicherte Aenderungen verwerfen und das Produkt wirklich loeschen?")
                }
              />
              <button
                type="button"
                disabled={!hasUnsavedChanges || isSaving || isPending}
                onClick={() => {
                  void handleSave();
                }}
                className="admin-action-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving || isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Speichern
              </button>
            </div>
          </div>

          <div className="mt-2 grid gap-1 md:grid-cols-3 xl:grid-cols-6">
            {publicationChecklist.items.map((item) => (
              <PublicationRequirementCard key={item.id} item={item} />
            ))}
          </div>
        </header>

        {saveError || saveMessage || taxonomyMessage || syncError || syncState ? (
          <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-2">
              {saveError ? <p className="admin-alert admin-alert-error">{saveError}</p> : null}
              {saveMessage ? <p className="admin-alert admin-alert-success">{saveMessage}</p> : null}
              {taxonomyMessage ? <p className="admin-alert admin-alert-success">{taxonomyMessage}</p> : null}
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

        <div className="space-y-2">
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
              title="Shop und Status"
              hint="Sekundaere Felder und Sync-Info."
              icon={<SlidersHorizontal className="h-4 w-4 text-slate-400" />}
            >
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
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

                <div className="flex items-end">
                  <label className="flex min-h-[2rem] items-center gap-2 border border-slate-300 px-2 py-1 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={draft.isPersonalizable}
                      onChange={(event) => setField("isPersonalizable", event.target.checked)}
                    />
                    Personalisierbar
                  </label>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                <span>Featured: {draft.featured ? "ja" : "nein"}</span>
                <span>Sync: {draft.shopifySyncStatus ?? "offen"}</span>
                {draft.shopifySyncError ? <span>Fehler: {draft.shopifySyncError}</span> : null}
                {draft.shopifyLastSyncedAt ? <span>Letzter Sync: {formatDateTime(draft.shopifyLastSyncedAt)}</span> : null}
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
              <div className="grid gap-1 md:grid-cols-2 xl:grid-cols-3">
                <ManagedTaxonomySelect
                  label="Kategorie"
                  publicationStatus={publicationItemsById["shop-assignment"].status}
                  publicationHint={publicationItemsById["shop-assignment"].detail}
                  selectedId={draft.categoryId}
                  options={taxonomyCatalog.category}
                  isBusy={Boolean(taxonomyBusyKey)}
                  newValue={newTaxonomyValues.category}
                  onSelect={(id) => updateDraftTaxonomy("category", id)}
                  onNewValueChange={(value) => setNewTaxonomyValue("category", value)}
                  onCreate={() => createTaxonomy("category")}
                  onRenameValueChange={(taxonomyId, value) =>
                    setTaxonomyRenameValues((current) => ({ ...current, [taxonomyId]: value }))
                  }
                  getRenameValue={getTaxonomyRenameValue}
                  onRename={(taxonomyId) => renameTaxonomy("category", taxonomyId)}
                  onDelete={(taxonomyId) => deleteTaxonomy("category", taxonomyId)}
                />

                <ManagedTaxonomySelect
                  label="Shop-Kategorie"
                  publicationStatus={publicationItemsById["shop-assignment"].status}
                  publicationHint="Wird fuer Shop-Listen und Routing mitgeprueft."
                  selectedId={draft.shopCategoryId}
                  options={taxonomyCatalog.shopCategory}
                  isBusy={Boolean(taxonomyBusyKey)}
                  newValue={newTaxonomyValues.shopCategory}
                  onSelect={(id) => updateDraftTaxonomy("shopCategory", id)}
                  onNewValueChange={(value) => setNewTaxonomyValue("shopCategory", value)}
                  onCreate={() => createTaxonomy("shopCategory")}
                  onRenameValueChange={(taxonomyId, value) =>
                    setTaxonomyRenameValues((current) => ({ ...current, [taxonomyId]: value }))
                  }
                  getRenameValue={getTaxonomyRenameValue}
                  onRename={(taxonomyId) => renameTaxonomy("shopCategory", taxonomyId)}
                  onDelete={(taxonomyId) => deleteTaxonomy("shopCategory", taxonomyId)}
                />

                <ManagedTaxonomySelect
                  label="Glasart"
                  selectedId={draft.glassTypeId}
                  options={taxonomyCatalog.glassType}
                  isBusy={Boolean(taxonomyBusyKey)}
                  newValue={newTaxonomyValues.glassType}
                  onSelect={(id) => updateDraftTaxonomy("glassType", id)}
                  onNewValueChange={(value) => setNewTaxonomyValue("glassType", value)}
                  onCreate={() => createTaxonomy("glassType")}
                  onRenameValueChange={(taxonomyId, value) =>
                    setTaxonomyRenameValues((current) => ({ ...current, [taxonomyId]: value }))
                  }
                  getRenameValue={getTaxonomyRenameValue}
                  onRename={(taxonomyId) => renameTaxonomy("glassType", taxonomyId)}
                  onDelete={(taxonomyId) => deleteTaxonomy("glassType", taxonomyId)}
                />

                <ManagedTaxonomySelect
                  label="Anlass"
                  selectedId={draft.occasionId}
                  options={taxonomyCatalog.occasion}
                  isBusy={Boolean(taxonomyBusyKey)}
                  newValue={newTaxonomyValues.occasion}
                  onSelect={(id) => updateDraftTaxonomy("occasion", id)}
                  onNewValueChange={(value) => setNewTaxonomyValue("occasion", value)}
                  onCreate={() => createTaxonomy("occasion")}
                  onRenameValueChange={(taxonomyId, value) =>
                    setTaxonomyRenameValues((current) => ({ ...current, [taxonomyId]: value }))
                  }
                  getRenameValue={getTaxonomyRenameValue}
                  onRename={(taxonomyId) => renameTaxonomy("occasion", taxonomyId)}
                  onDelete={(taxonomyId) => deleteTaxonomy("occasion", taxonomyId)}
                />

                <ManagedTaxonomySelect
                  label="Kollektion"
                  publicationStatus={publicationItemsById["shop-assignment"].status}
                  publicationHint="Kollektion und Slug muessen fuer die Veroeffentlichung gesetzt sein."
                  selectedId={draft.collectionId}
                  options={taxonomyCatalog.collection}
                  isBusy={Boolean(taxonomyBusyKey)}
                  newValue={newTaxonomyValues.collection}
                  onSelect={(id) => updateDraftTaxonomy("collection", id)}
                  onNewValueChange={(value) => setNewTaxonomyValue("collection", value)}
                  onCreate={() => createTaxonomy("collection")}
                  onRenameValueChange={(taxonomyId, value) =>
                    setTaxonomyRenameValues((current) => ({ ...current, [taxonomyId]: value }))
                  }
                  getRenameValue={getTaxonomyRenameValue}
                  onRename={(taxonomyId) => renameTaxonomy("collection", taxonomyId)}
                  onDelete={(taxonomyId) => deleteTaxonomy("collection", taxonomyId)}
                />

                <ManagedTaxonomySelect
                  label="Designer"
                  selectedId={draft.designerId}
                  options={taxonomyCatalog.designer}
                  isBusy={Boolean(taxonomyBusyKey)}
                  newValue={newTaxonomyValues.designer}
                  onSelect={(id) => updateDraftTaxonomy("designer", id)}
                  onNewValueChange={(value) => setNewTaxonomyValue("designer", value)}
                  onCreate={() => createTaxonomy("designer")}
                  onRenameValueChange={(taxonomyId, value) =>
                    setTaxonomyRenameValues((current) => ({ ...current, [taxonomyId]: value }))
                  }
                  getRenameValue={getTaxonomyRenameValue}
                  onRename={(taxonomyId) => renameTaxonomy("designer", taxonomyId)}
                  onDelete={(taxonomyId) => deleteTaxonomy("designer", taxonomyId)}
                />

                <Field
                  label="Kollektion-Slug"
                  publicationStatus={publicationItemsById["shop-assignment"].status}
                  publicationHint="Wird automatisch aus der gewaelten Kollektion gepflegt."
                  plain
                >
                  <input
                    value={draft.collectionSlug}
                    readOnly
                    className="h-8 w-full rounded-none border border-slate-300 bg-slate-100 px-2 text-sm text-slate-900 shadow-none outline-none"
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              id="description"
              title="Beschreibung"
              hint="Textfelder ohne Zusatz-UI."
              icon={<SlidersHorizontal className="h-4 w-4 text-slate-400" />}
            >
              <div className="grid gap-2">
                <Field label="Lange Beschreibung">
                  <AutoResizeTextarea
                    value={draft.longDescription}
                    onChange={(event) => setField("longDescription", event.target.value)}
                    minRows={5}
                    placeholder="Volle Produktbeschreibung"
                  />
                </Field>

                <div className="grid gap-2 md:grid-cols-2">
                  <Field label="Pflegehinweis">
                    <AutoResizeTextarea
                      value={draft.care}
                      onChange={(event) => setField("care", event.target.value)}
                      minRows={3}
                      placeholder="Hinweise fuer Reinigung und Nutzung"
                    />
                  </Field>

                  <Field label="Benefits" hint="Eine Zeile pro Benefit.">
                    <AutoResizeTextarea
                      value={benefitsText}
                      onChange={(event) => setField("benefits", splitLines(event.target.value))}
                      minRows={3}
                      placeholder={"Benefit 1\nBenefit 2"}
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              id="variants"
              title="Varianten"
              hint="Zeilenansicht, Details nur aufgeklappt."
              icon={<Package2 className="h-4 w-4 text-slate-400" />}
              action={
                <button
                  type="button"
                  onClick={addVariant}
                  className="admin-action-secondary !px-2 !py-1 !text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Variante
                </button>
              }
            >
              <PublicationSectionSummary
                title="Varianten-Checks fuer die Veroeffentlichung"
                items={[publicationItemsById["active-variant"], publicationItemsById.price]}
              />
              {draft.variants.length === 0 ? (
                <div className="border border-dashed border-slate-300 px-2 py-2 text-sm text-slate-500">
                  Noch keine Varianten vorhanden.
                </div>
              ) : (
                <div className="border border-slate-300">
                  {draft.variants.map((variant, index) => {
                    const isOpen = openVariantIds[variant.id] ?? false;

                    return (
                      <article key={variant.id} className="border-t border-slate-300 first:border-t-0">
                        <div className="grid gap-2 px-2 py-2 lg:grid-cols-[minmax(0,1.3fr)_160px_120px_140px_auto] lg:items-center">
                          <button
                            type="button"
                            onClick={() => toggleVariantOpen(variant.id)}
                            className="flex min-w-0 items-center gap-1 text-left"
                            aria-expanded={isOpen}
                          >
                            {isOpen ? (
                              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                            )}
                            <span className="truncate text-sm font-medium text-slate-950">
                              {variant.name || `Variante ${index + 1}`}
                            </span>
                            {draft.defaultVariantId === variant.id ? <MetaPill tone="success">Default</MetaPill> : null}
                            {variant.id === publicationVariant?.id ? (
                              <MetaPill tone={getPublicationStatusTone(publicationItemsById.price.status)}>Active</MetaPill>
                            ) : null}
                          </button>

                          <div className="text-xs text-slate-600">SKU {variant.sku || "-"}</div>
                          <div className="text-xs text-slate-600">{formatMoneyFromCents(variant.priceCents)}</div>
                          <div className="text-xs text-slate-600">{getStockSummary(variant)}</div>

                          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                            <label className="inline-flex items-center gap-1 border border-slate-300 px-2 py-1 text-[11px] text-slate-700">
                              <input
                                type="radio"
                                name="defaultVariant"
                                checked={draft.defaultVariantId === variant.id}
                                onChange={() => setField("defaultVariantId", variant.id)}
                              />
                              Standard
                            </label>
                            <label className="inline-flex items-center gap-1 border border-slate-300 px-2 py-1 text-[11px] text-slate-700">
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
                            <button
                              type="button"
                              onClick={() => removeVariant(variant.id)}
                              title="Variante loeschen"
                              aria-label="Variante loeschen"
                              className="admin-action-danger !px-2 !py-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {isOpen ? (
                          <div className="grid gap-2 border-t border-slate-300 px-2 py-2 md:grid-cols-2 xl:grid-cols-4">
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
              hint="Kleine Vorschau, direkte Aktionen."
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
              hint="Kompakte Zeilen, Details bei Bedarf."
              icon={<SlidersHorizontal className="h-4 w-4 text-slate-400" />}
              action={
                <button
                  type="button"
                  onClick={addOption}
                  className="admin-action-secondary !px-2 !py-1 !text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Option
                </button>
              }
            >
              {draft.options.length === 0 ? (
                <div className="border border-dashed border-slate-300 px-2 py-2 text-sm text-slate-500">
                  Noch keine Personalisierungsoptionen vorhanden.
                </div>
              ) : (
                <div className="border border-slate-300">
                  {draft.options.map((option, optionIndex) => {
                    const isOpen = openOptionIds[option.id] ?? false;

                    return (
                      <article key={option.id} className="border-t border-slate-300 first:border-t-0">
                        <div className="grid gap-2 px-2 py-2 lg:grid-cols-[minmax(0,1.3fr)_160px_120px_100px_auto] lg:items-center">
                          <button
                            type="button"
                            onClick={() => toggleOptionOpen(option.id)}
                            className="flex min-w-0 items-center gap-1 text-left"
                            aria-expanded={isOpen}
                          >
                            {isOpen ? (
                              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                            )}
                            <span className="truncate text-sm font-medium text-slate-950">
                              {option.name || `Option ${optionIndex + 1}`}
                            </span>
                            {option.isRequired ? <MetaPill tone="warning">Pflicht</MetaPill> : null}
                            <MetaPill tone={option.isActive ? "success" : "neutral"}>
                              {option.isActive ? "Aktiv" : "Inaktiv"}
                            </MetaPill>
                          </button>

                          <div className="truncate text-xs text-slate-600">{option.code || "kein-code"}</div>
                          <div className="text-xs text-slate-600">{option.type}</div>
                          <div className="text-xs text-slate-600">{option.values.length} Werte</div>

                          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                            <label className="inline-flex items-center gap-1 border border-slate-300 px-2 py-1 text-[11px] text-slate-700">
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
                            <label className="inline-flex items-center gap-1 border border-slate-300 px-2 py-1 text-[11px] text-slate-700">
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
                              title="Option loeschen"
                              aria-label="Option loeschen"
                              className="admin-action-danger !px-2 !py-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {isOpen ? (
                          <div className="space-y-2 border-t border-slate-300 px-2 py-2">
                            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
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

                            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
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
                              <div className="border border-slate-300">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 px-2 py-1.5">
                                  <p className="text-xs font-semibold text-slate-900">Select-Werte</p>
                                  <button
                                    type="button"
                                    onClick={() => addSelectValue(option.id)}
                                    className="admin-action-secondary !px-2 !py-1 !text-xs"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    Wert
                                  </button>
                                </div>

                                <div>
                                  {option.values.map((value) => (
                                    <div
                                      key={value.id}
                                      className="grid gap-2 border-t border-slate-300 px-2 py-2 first:border-t-0 lg:grid-cols-[1fr_1fr_120px_auto_auto]"
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
                                      <label className="inline-flex items-center gap-1 border border-slate-300 px-2 py-1 text-[11px] text-slate-700">
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
                                        title="Wert loeschen"
                                        aria-label="Wert loeschen"
                                        className="admin-action-danger !px-2 !py-1"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
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
      </div>
    </section>
  );
}
