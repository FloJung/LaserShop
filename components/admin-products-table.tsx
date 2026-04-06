"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  ArrowDownAZ,
  ArrowUpZA,
  CheckSquare2,
  Clock3,
  FilterX,
  LoaderCircle,
  PencilLine,
  Search,
  Square,
  Trash2
} from "lucide-react";
import { AdminCreateProductButton } from "@/components/admin-create-product-button";

type ProductStatus = "draft" | "active" | "archived";

type AdminProductListItem = {
  id: string;
  title: string;
  slug: string;
  status: ProductStatus;
  category: string;
  shopCategory: string;
  glassType: string;
  collection: string;
  featured: boolean;
  variantCount: number;
  updatedAt: string;
  shopifySyncStatus?: "pending" | "synced" | "error";
  shopifySyncError?: string;
  shopifyLastSyncedAt?: string;
  shopifyLastAttemptedAt?: string;
};

type AdminProductsTableProps = {
  products: AdminProductListItem[];
};

type SortOption = "updated-desc" | "updated-asc" | "title-asc" | "title-desc";

type StatusUpdateSuccess = {
  ok: true;
  changed: boolean;
  productId: string;
  status: ProductStatus;
  summary: AdminProductListItem;
  message: string;
  shopifySync: {
    success: boolean;
    error?: string | null;
    shopifyError?: string | null;
  };
};

type StatusUpdateFailure = {
  ok: false;
  productId: string;
  status: ProductStatus;
  error: string;
  validationIssues?: Array<{
    field: string;
    message: string;
  }>;
};

type StatusUpdateResult = StatusUpdateSuccess | StatusUpdateFailure;

type BulkStatusUpdateResponse = {
  status: ProductStatus;
  totalCount: number;
  successCount: number;
  failureCount: number;
  updatedProducts: AdminProductListItem[];
  results: StatusUpdateResult[];
};

type ProductDeleteSuccess = {
  ok: true;
  productId: string;
  title: string;
  message: string;
};

type ProductDeleteFailure = {
  ok: false;
  productId: string;
  error: string;
};

type ProductDeleteResult = ProductDeleteSuccess | ProductDeleteFailure;

type BulkDeleteResponse = {
  totalCount: number;
  successCount: number;
  failureCount: number;
  deletedProductIds: string[];
  results: ProductDeleteResult[];
};

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "updated-desc", label: "Neueste zuerst" },
  { value: "updated-asc", label: "Aelteste zuerst" },
  { value: "title-asc", label: "Name A-Z" },
  { value: "title-desc", label: "Name Z-A" }
];

const STATUS_FILTERS: Array<{ value: "all" | ProductStatus; label: string }> = [
  { value: "all", label: "Alle" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" }
];

const STATUS_OPTIONS: ProductStatus[] = ["draft", "active", "archived"];

function SortIndicator({ sortBy }: { sortBy: SortOption }) {
  if (sortBy === "title-asc") {
    return <ArrowDownAZ className="h-3.5 w-3.5" />;
  }

  if (sortBy === "title-desc") {
    return <ArrowUpZA className="h-3.5 w-3.5" />;
  }

  return <Clock3 className="h-3.5 w-3.5" />;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getStatusLabel(status: ProductStatus) {
  if (status === "active") {
    return "Active";
  }

  if (status === "archived") {
    return "Archived";
  }

  return "Draft";
}

function getStatusClasses(status: ProductStatus) {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "archived") {
    return "border-stone-200 bg-stone-100 text-stone-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getSyncTone(status?: AdminProductListItem["shopifySyncStatus"]) {
  if (status === "synced") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "error") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-white text-slate-600";
}

function getSyncLabel(status?: AdminProductListItem["shopifySyncStatus"]) {
  if (status === "synced") {
    return "Shopify ok";
  }

  if (status === "error") {
    return "Shopify Fehler";
  }

  return "Shopify offen";
}

function normalizeLabel(value: string) {
  return value.trim() || "Ohne Zuordnung";
}

function matchesSearch(product: AdminProductListItem, searchTerm: string) {
  if (!searchTerm) {
    return true;
  }

  const haystack = [product.title, product.slug, product.id].join(" ").toLocaleLowerCase("de-DE");
  return haystack.includes(searchTerm);
}

function buildBulkSummary(payload: BulkStatusUpdateResponse) {
  const statusLabel = getStatusLabel(payload.status);
  const base =
    payload.successCount > 0
      ? `${payload.successCount} Produkte erfolgreich auf ${statusLabel} gesetzt.`
      : "Keine Produkte wurden aktualisiert.";
  const failures = payload.results.filter((result): result is StatusUpdateFailure => !result.ok);

  if (failures.length === 0) {
    return base;
  }

  return `${base} ${failures.length} fehlgeschlagen: ${failures
    .map((failure) => failure.validationIssues?.map((issue) => issue.message).join(" ") ?? failure.error)
    .join(" | ")}`;
}

function buildBulkDeleteSummary(payload: BulkDeleteResponse) {
  const base =
    payload.successCount > 0
      ? `${payload.successCount} Produkte erfolgreich geloescht.`
      : "Keine Produkte wurden geloescht.";
  const failures = payload.results.filter((result): result is ProductDeleteFailure => !result.ok);

  if (failures.length === 0) {
    return base;
  }

  return `${base} ${failures.length} fehlgeschlagen: ${failures.map((failure) => failure.error).join(" | ")}`;
}

function StatusSelect({
  product,
  disabled,
  isPending,
  onChange
}: {
  product: AdminProductListItem;
  disabled: boolean;
  isPending: boolean;
  onChange: (status: ProductStatus) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={product.status}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as ProductStatus)}
        className="admin-field !min-h-[2.35rem] !rounded-xl !px-3 !py-2 text-xs font-semibold uppercase tracking-[0.12em] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      {isPending ? <LoaderCircle className="h-4 w-4 animate-spin text-slate-400" /> : null}
    </div>
  );
}

export function AdminProductsTable({ products }: AdminProductsTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState(products);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductStatus>("all");
  const [featuredFilter, setFeaturedFilter] = useState<"all" | "featured">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("updated-desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingStatusIds, setPendingStatusIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deferredSearchTerm = useDeferredValue(searchTerm.trim().toLocaleLowerCase("de-DE"));

  useEffect(() => {
    setRows(products);
  }, [products]);

  const categories = Array.from(new Set(rows.map((product) => normalizeLabel(product.category)))).sort((left, right) =>
    left.localeCompare(right, "de")
  );

  const statusCounts = {
    all: rows.length,
    active: rows.filter((product) => product.status === "active").length,
    draft: rows.filter((product) => product.status === "draft").length,
    archived: rows.filter((product) => product.status === "archived").length
  };

  const filteredProducts = rows
    .filter((product) => matchesSearch(product, deferredSearchTerm))
    .filter((product) => (statusFilter === "all" ? true : product.status === statusFilter))
    .filter((product) => (featuredFilter === "featured" ? product.featured : true))
    .filter((product) => (categoryFilter === "all" ? true : normalizeLabel(product.category) === categoryFilter))
    .sort((left, right) => {
      if (sortBy === "title-asc") {
        return left.title.localeCompare(right.title, "de");
      }

      if (sortBy === "title-desc") {
        return right.title.localeCompare(left.title, "de");
      }

      const leftTime = new Date(left.updatedAt).getTime();
      const rightTime = new Date(right.updatedAt).getTime();

      return sortBy === "updated-asc" ? leftTime - rightTime : rightTime - leftTime;
    });

  const selectedVisibleCount = filteredProducts.filter((product) => selectedIds.includes(product.id)).length;
  const allVisibleSelected = filteredProducts.length > 0 && selectedVisibleCount === filteredProducts.length;
  const activeFilterCount =
    Number(searchTerm.trim().length > 0) +
    Number(statusFilter !== "all") +
    Number(featuredFilter !== "all") +
    Number(categoryFilter !== "all");
  const featuredCount = filteredProducts.filter((product) => product.featured).length;
  const variantTotal = filteredProducts.reduce((sum, product) => sum + product.variantCount, 0);
  const selectedProducts = useMemo(
    () => rows.filter((product) => selectedIds.includes(product.id)),
    [rows, selectedIds]
  );
  const isBulkBusy = isBulkUpdating || isBulkDeleting;

  function clearMessages() {
    setFeedbackMessage(null);
    setErrorMessage(null);
  }

  function toggleSelection(productId: string) {
    clearMessages();
    setSelectedIds((current) =>
      current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]
    );
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !filteredProducts.some((product) => product.id === id)));
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...filteredProducts.map((product) => product.id)])));
  }

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setFeaturedFilter("all");
    setCategoryFilter("all");
    setSortBy("updated-desc");
  }

  function mergeUpdatedProducts(updatedProducts: AdminProductListItem[]) {
    if (updatedProducts.length === 0) {
      return;
    }

    const updatedMap = new Map(updatedProducts.map((product) => [product.id, product]));
    setRows((current) => current.map((product) => updatedMap.get(product.id) ?? product));
  }

  function removeDeletedProducts(deletedProductIds: string[]) {
    if (deletedProductIds.length === 0) {
      return;
    }

    const deletedSet = new Set(deletedProductIds);
    setRows((current) => current.filter((product) => !deletedSet.has(product.id)));
  }

  async function handleInlineStatusChange(productId: string, status: ProductStatus) {
    const existing = rows.find((product) => product.id === productId);
    if (!existing || existing.status === status) {
      return;
    }

    clearMessages();
    setPendingStatusIds((current) => Array.from(new Set([...current, productId])));

    try {
      const response = await fetch(`/api/admin/products/${productId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });

      const payload = (await response.json().catch(() => null)) as StatusUpdateResult | null;
      if (!response.ok || !payload) {
        setErrorMessage(payload && !payload.ok ? payload.error : "Status konnte nicht aktualisiert werden.");
        return;
      }

      if (!payload.ok) {
        setErrorMessage(payload.error);
        return;
      }

      mergeUpdatedProducts([payload.summary]);
      setFeedbackMessage(
        payload.shopifySync.success
          ? payload.message
          : `${payload.message} Shopify-Sync fehlgeschlagen: ${payload.shopifySync.shopifyError ?? payload.shopifySync.error ?? "Unbekannter Fehler."}`
      );
      router.refresh();
    } finally {
      setPendingStatusIds((current) => current.filter((id) => id !== productId));
    }
  }

  async function handleBulkStatusChange(status: ProductStatus) {
    if (selectedProducts.length === 0 || isBulkBusy) {
      return;
    }

    if (status === "archived") {
      const shouldArchive = window.confirm(`${selectedProducts.length} Produkte wirklich gesammelt archivieren?`);
      if (!shouldArchive) {
        return;
      }
    }

    clearMessages();
    setIsBulkUpdating(true);

    try {
      const response = await fetch("/api/admin/products/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productIds: selectedProducts.map((product) => product.id),
          status
        })
      });

      const payload = (await response.json().catch(() => null)) as BulkStatusUpdateResponse | { error?: string } | null;
      if (!payload || !("results" in payload)) {
        setErrorMessage(payload && "error" in payload ? payload.error ?? "Bulk-Statuswechsel fehlgeschlagen." : "Bulk-Statuswechsel fehlgeschlagen.");
        return;
      }

      mergeUpdatedProducts(payload.updatedProducts);
      setFeedbackMessage(buildBulkSummary(payload));

      if (payload.failureCount === 0) {
        setSelectedIds([]);
      } else {
        setSelectedIds(
          payload.results.filter((result): result is StatusUpdateFailure => !result.ok).map((result) => result.productId)
        );
      }

      router.refresh();
    } finally {
      setIsBulkUpdating(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedProducts.length === 0 || isBulkBusy) {
      return;
    }

    const confirmed = window.confirm(
      `${selectedProducts.length} Produkte wirklich loeschen?\n\nDiese Aktion entfernt Produkte, Varianten, Bilder und Optionen dauerhaft.`
    );
    if (!confirmed) {
      return;
    }

    clearMessages();
    setIsBulkDeleting(true);

    try {
      const response = await fetch("/api/admin/products/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productIds: selectedProducts.map((product) => product.id)
        })
      });

      const payload = (await response.json().catch(() => null)) as BulkDeleteResponse | { error?: string } | null;
      if (!payload || !("results" in payload)) {
        setErrorMessage(payload && "error" in payload ? payload.error ?? "Bulk-Loeschung fehlgeschlagen." : "Bulk-Loeschung fehlgeschlagen.");
        return;
      }

      removeDeletedProducts(payload.deletedProductIds);
      setFeedbackMessage(buildBulkDeleteSummary(payload));

      if (payload.failureCount === 0) {
        setSelectedIds([]);
      } else {
        setSelectedIds(
          payload.results.filter((result): result is ProductDeleteFailure => !result.ok).map((result) => result.productId)
        );
      }

      router.refresh();
    } finally {
      setIsBulkDeleting(false);
    }
  }

  return (
    <section className="section">
      <div className="shell space-y-4">
        <div className="admin-panel rounded-[2rem] p-5 sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
                <span>Admin Products</span>
                <span className="admin-meta-pill !px-3 !py-1 !text-[10px] !tracking-[0.14em]">{rows.length} Eintraege</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">Produkte verwalten</h1>
                <p className="mt-2 max-w-3xl text-sm text-[var(--text-soft)]">
                  Verdichtete Admin-Liste fuer schnelle Suche, Filter, Inline-Statuswechsel und Bulk-Aktionen.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/admin" className="admin-action-secondary !px-4 !py-2.5 !text-sm">
                Zurueck zum Admin
              </Link>
              <AdminCreateProductButton />
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "Sichtbar", value: String(filteredProducts.length), hint: activeFilterCount > 0 ? "Gefiltert" : "Alle Produkte" },
              { label: "Active", value: String(filteredProducts.filter((product) => product.status === "active").length), hint: "Live im Shop" },
              { label: "Draft", value: String(filteredProducts.filter((product) => product.status === "draft").length), hint: "Nicht veroeffentlicht" },
              { label: "Varianten", value: String(variantTotal), hint: "Im sichtbaren Set" },
              { label: "Bestseller", value: String(featuredCount), hint: "Markierte Produkte" }
            ].map((card) => (
            <article key={card.label} className="admin-subpanel rounded-[1.5rem] px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{card.label}</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-2xl font-bold tracking-tight text-[var(--text)]">{card.value}</p>
                <p className="text-xs text-[var(--text-soft)]">{card.hint}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="admin-panel rounded-[2rem] p-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_auto_auto] xl:items-end">
            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Suche</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Produktname, ID oder Slug durchsuchen"
                  className="admin-field !rounded-2xl !py-3 !pl-10 !pr-4 text-sm"
                />
              </span>
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Kategorie</span>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="admin-field !rounded-2xl !py-3 text-sm"
              >
                <option value="all">Alle Kategorien</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Sortierung</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="admin-field !rounded-2xl !py-3 text-sm"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_FILTERS.map((status) => {
                const isActive = statusFilter === status.value;
                const count = statusCounts[status.value];

                return (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => setStatusFilter(status.value)}
                    className={clsx(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition",
                      isActive
                        ? "border-[rgba(231,119,44,0.34)] bg-[rgba(231,119,44,0.12)] text-[var(--brand-strong)]"
                        : "border-[var(--line)] bg-white/80 text-[var(--text-soft)] hover:border-[rgba(231,119,44,0.22)] hover:text-[var(--text)]"
                    )}
                  >
                    <span>{status.label}</span>
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] tracking-[0.08em] text-[var(--text)]">
                      {count}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setFeaturedFilter((current) => (current === "featured" ? "all" : "featured"))}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition",
                  featuredFilter === "featured"
                    ? "border-[rgba(231,119,44,0.34)] bg-[rgba(231,119,44,0.12)] text-[var(--brand-strong)]"
                    : "border-[var(--line)] bg-white/80 text-[var(--text-soft)] hover:border-[rgba(231,119,44,0.22)] hover:text-[var(--text)]"
                )}
              >
                <span>Nur Bestseller</span>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] tracking-[0.08em] text-[var(--text)]">
                  {rows.filter((product) => product.featured).length}
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-soft)]">
              <span className="admin-meta-pill !rounded-full !px-3 !py-2 !text-xs">
                <Clock3 className="h-3.5 w-3.5" />
                {filteredProducts.length} sichtbar
              </span>
              <span className="admin-meta-pill !rounded-full !px-3 !py-2 !text-xs">{selectedIds.length} ausgewaehlt</span>
              <button
                type="button"
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)] transition hover:border-[rgba(231,119,44,0.22)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FilterX className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
          </div>
        </div>

        {feedbackMessage ? <p className="admin-alert admin-alert-success">{feedbackMessage}</p> : null}
        {errorMessage ? <p className="admin-alert admin-alert-error">{errorMessage}</p> : null}

        {selectedIds.length > 0 ? (
          <div className="admin-panel sticky top-4 z-30 rounded-[1.5rem] px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">{selectedIds.length} Produkte ausgewaehlt</p>
                <p className="mt-1 text-xs text-[var(--text-soft)]">
                  Bulk-Statuswechsel validiert jedes Produkt einzeln. Loeschen nutzt denselben Backend-Pfad wie der Einzel-Delete.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="bulk-status-select">
                  Status fuer ausgewaehlte Produkte setzen
                </label>
                <div className="relative">
                  <select
                    id="bulk-status-select"
                    defaultValue=""
                    disabled={isBulkBusy}
                    onChange={(event) => {
                      const nextStatus = event.target.value as ProductStatus;
                      event.target.value = "";

                      if (!nextStatus) {
                        return;
                      }

                      void handleBulkStatusChange(nextStatus);
                    }}
                    className="admin-field !min-h-[2.55rem] !rounded-xl !py-2.5 !pl-3 !pr-9 text-xs font-semibold uppercase tracking-[0.12em] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="" disabled>
                      {isBulkUpdating ? "Status wird aktualisiert..." : "Status aendern"}
                    </option>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {getStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                  {isBulkUpdating ? (
                    <LoaderCircle className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={isBulkBusy}
                  onClick={() => {
                    void handleBulkDelete();
                  }}
                  title={`${selectedIds.length} Produkte loeschen`}
                  aria-label={`${selectedIds.length} Produkte loeschen`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBulkDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  <span className="hidden sm:inline">Loeschen</span>
                </button>
                <button
                  type="button"
                  disabled={isBulkBusy}
                  onClick={() => setSelectedIds([])}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)] transition hover:border-[rgba(231,119,44,0.22)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Auswahl aufheben
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="admin-panel overflow-hidden rounded-[2rem]">
          <div className="flex flex-col gap-3 border-b border-[rgba(148,163,184,0.14)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Produktliste</p>
              <p className="mt-1 text-xs text-[var(--text-soft)]">
                Status direkt in der Zeile aendern oder mehrere Produkte gesammelt umstellen.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="admin-meta-pill !rounded-full !px-3 !py-2 !text-xs">
                {selectedVisibleCount > 0 ? `${selectedVisibleCount} im aktuellen Filter gewaehlt` : "Keine Auswahl"}
              </span>
              <span className="admin-meta-pill !rounded-full !px-3 !py-2 !text-xs">
                <SortIndicator sortBy={sortBy} />
                {SORT_OPTIONS.find((option) => option.value === sortBy)?.label}
              </span>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-base font-semibold text-[var(--text)]">Keine Produkte fuer diese Filter gefunden.</p>
              <p className="mt-2 text-sm text-[var(--text-soft)]">
                Passe Suche oder Filter an, um wieder Produkte einzublenden.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <div className="max-h-[68vh] overflow-auto">
                  <div className="min-w-[1040px]">
                    <div className="sticky top-0 z-20 grid grid-cols-[48px_minmax(320px,2.5fr)_minmax(210px,1.1fr)_minmax(220px,1.1fr)_120px_64px] items-center gap-4 border-b border-[rgba(148,163,184,0.14)] bg-[rgba(248,250,252,0.92)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)] backdrop-blur">
                      <button
                        type="button"
                        onClick={toggleSelectAllVisible}
                        title={allVisibleSelected ? "Sichtbare Auswahl aufheben" : "Alle sichtbaren Produkte auswaehlen"}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--line)] bg-white text-[var(--text-soft)] transition hover:border-[rgba(231,119,44,0.22)] hover:text-[var(--brand-strong)]"
                      >
                        {allVisibleSelected ? <CheckSquare2 className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      </button>
                      <span>Produkt</span>
                      <span>Kategorie</span>
                      <span>Status</span>
                      <span>Update</span>
                      <span className="text-right">Edit</span>
                    </div>

                    <div className="divide-y divide-[rgba(148,163,184,0.12)]">
                      {filteredProducts.map((product, index) => {
                        const isSelected = selectedIds.includes(product.id);
                        const isPending = pendingStatusIds.includes(product.id);

                        return (
                          <article
                            key={product.id}
                            className={clsx(
                              "group grid grid-cols-[48px_minmax(320px,2.5fr)_minmax(210px,1.1fr)_minmax(220px,1.1fr)_120px_64px] items-center gap-4 px-4 py-3 text-sm transition",
                              index % 2 === 0 ? "bg-white/92" : "bg-[rgba(248,250,252,0.88)]",
                              isSelected && "bg-[rgba(231,119,44,0.08)]",
                              "hover:bg-[rgba(255,247,237,0.92)]"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => toggleSelection(product.id)}
                              aria-label={`${product.title} auswaehlen`}
                              className={clsx(
                                "inline-flex h-8 w-8 items-center justify-center rounded-xl border transition",
                                isSelected
                                  ? "border-[rgba(231,119,44,0.34)] bg-[rgba(231,119,44,0.14)] text-[var(--brand-strong)]"
                                  : "border-[var(--line)] bg-white text-[var(--text-soft)] hover:border-[rgba(231,119,44,0.22)] hover:text-[var(--brand-strong)]"
                              )}
                            >
                              {isSelected ? <CheckSquare2 className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                            </button>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-semibold text-[var(--text)]">{product.title}</p>
                                {product.featured ? (
                                  <span className="rounded-full border border-[rgba(231,119,44,0.18)] bg-[rgba(231,119,44,0.1)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-strong)]">
                                    Bestseller
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-soft)]">
                                <span>ID {product.id}</span>
                                <span>/{product.slug}</span>
                                <span>{product.variantCount} Varianten</span>
                              </div>
                            </div>

                            <div className="min-w-0 text-xs leading-5 text-[var(--text-soft)]">
                              <p className="truncate font-medium text-[var(--text)]">{normalizeLabel(product.category)}</p>
                              <p className="truncate">{normalizeLabel(product.shopCategory)}</p>
                              <p className="truncate">
                                {normalizeLabel(product.collection)} &middot; {normalizeLabel(product.glassType)}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={clsx(
                                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                                    getStatusClasses(product.status)
                                  )}
                                >
                                  {getStatusLabel(product.status)}
                                </span>
                                <span
                                  className={clsx(
                                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                                    getSyncTone(product.shopifySyncStatus)
                                  )}
                                >
                                  {getSyncLabel(product.shopifySyncStatus)}
                                </span>
                              </div>

                              <StatusSelect
                                product={product}
                                disabled={isPending || isBulkBusy}
                                isPending={isPending}
                                onChange={(status) => {
                                  void handleInlineStatusChange(product.id, status);
                                }}
                              />

                              {product.shopifySyncError ? (
                                <p className="text-[11px] leading-4 text-rose-700">{product.shopifySyncError}</p>
                              ) : null}
                            </div>

                            <div className="text-xs leading-5 text-[var(--text-soft)]">
                              <p className="font-medium text-[var(--text)]">{formatDateTime(product.updatedAt)}</p>
                              <p>{product.status === "active" ? "Live" : "Nicht live"}</p>
                            </div>

                            <div className="flex justify-end">
                              <Link
                                href={`/admin/products/${product.id}`}
                                title={`${product.title} bearbeiten`}
                                aria-label={`${product.title} bearbeiten`}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] bg-white text-[var(--text-soft)] opacity-0 shadow-sm transition group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:border-[rgba(231,119,44,0.26)] hover:text-[var(--brand-strong)] focus-visible:opacity-100 md:translate-x-1"
                              >
                                <PencilLine className="h-4 w-4" />
                              </Link>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-[rgba(148,163,184,0.12)] md:hidden">
                {filteredProducts.map((product, index) => {
                  const isSelected = selectedIds.includes(product.id);
                  const isPending = pendingStatusIds.includes(product.id);

                  return (
                    <article
                      key={product.id}
                      className={clsx(
                        "space-y-3 px-4 py-4",
                        index % 2 === 0 ? "bg-white/92" : "bg-[rgba(248,250,252,0.88)]",
                        isSelected && "bg-[rgba(231,119,44,0.08)]"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleSelection(product.id)}
                          aria-label={`${product.title} auswaehlen`}
                          className={clsx(
                            "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition",
                            isSelected
                              ? "border-[rgba(231,119,44,0.34)] bg-[rgba(231,119,44,0.14)] text-[var(--brand-strong)]"
                              : "border-[var(--line)] bg-white text-[var(--text-soft)]"
                          )}
                        >
                          {isSelected ? <CheckSquare2 className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[var(--text)]">{product.title}</p>
                              <p className="mt-1 truncate text-xs text-[var(--text-soft)]">
                                ID {product.id} &middot; /{product.slug}
                              </p>
                            </div>
                            <Link
                              href={`/admin/products/${product.id}`}
                              title={`${product.title} bearbeiten`}
                              aria-label={`${product.title} bearbeiten`}
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-white text-[var(--text-soft)] shadow-sm transition hover:border-[rgba(231,119,44,0.26)] hover:text-[var(--brand-strong)]"
                            >
                              <PencilLine className="h-4 w-4" />
                            </Link>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span
                              className={clsx(
                                "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                                getStatusClasses(product.status)
                              )}
                            >
                              {getStatusLabel(product.status)}
                            </span>
                            <span
                              className={clsx(
                                "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                                getSyncTone(product.shopifySyncStatus)
                              )}
                            >
                              {getSyncLabel(product.shopifySyncStatus)}
                            </span>
                            {product.featured ? (
                              <span className="rounded-full border border-[rgba(231,119,44,0.18)] bg-[rgba(231,119,44,0.1)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-strong)]">
                                Bestseller
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-3">
                            <StatusSelect
                              product={product}
                              disabled={isPending || isBulkBusy}
                              isPending={isPending}
                              onChange={(status) => {
                                void handleInlineStatusChange(product.id, status);
                              }}
                            />
                          </div>

                          {product.shopifySyncError ? (
                            <p className="mt-2 text-xs text-rose-700">{product.shopifySyncError}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-2 rounded-2xl border border-[rgba(148,163,184,0.14)] bg-white/70 px-3 py-3 text-xs text-[var(--text-soft)]">
                        <div className="flex items-center justify-between gap-3">
                          <span>Kategorie</span>
                          <span className="truncate font-medium text-[var(--text)]">{normalizeLabel(product.category)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Katalog</span>
                          <span className="truncate text-right">{normalizeLabel(product.collection)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Varianten</span>
                          <span>{product.variantCount}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Update</span>
                          <span className="text-right">{formatDateTime(product.updatedAt)}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
