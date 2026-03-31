"use client";

import Link from "next/link";
import { AdminDeleteProductButton } from "@/components/admin-delete-product-button";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { collections, glassTypes, occasions, shopCategories } from "@/lib/data/products";

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
  storagePath?: string;
  url: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
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

function Section({
  title,
  hint,
  children
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-panel rounded-[2rem] p-7 lg:p-8">
      <div className="mb-6 border-b border-slate-200/70 pb-5">
        <h2 className="text-[1.35rem] font-bold tracking-[-0.02em] text-slate-900">{title}</h2>
        {hint ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function AdminProductEditor({ product }: AdminProductEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(product);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  function setField<K extends keyof EditableProduct>(key: K, value: EditableProduct[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleSave() {
    setSaveError(null);
    setSaveMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/products/${draft.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(draft)
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; updatedAt?: string } | null;

      if (!response.ok) {
        setSaveError(payload?.error ?? "Produkt konnte nicht gespeichert werden.");
        return;
      }

      setDraft((current) => ({
        ...current,
        updatedAt: payload?.updatedAt ?? current.updatedAt
      }));
      setSaveMessage("Produkt gespeichert.");
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsSaving(false);
    }
  }

  const benefitsText = joinLines(draft.benefits);

  return (
    <section className="section">
      <div className="shell admin-editor space-y-7">
        <div className="admin-hero rounded-[2rem] p-8 lg:p-10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand)]">Admin Product</p>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-slate-950 lg:text-4xl">{draft.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 lg:text-base">
                Bearbeite Live-Produktdaten, Varianten, Bilder und Personalisierungsoptionen fuer dieses Produkt.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/admin/products"
                className="admin-action-secondary"
              >
                Zur Produktliste
              </Link>
              <AdminDeleteProductButton productId={draft.id} productTitle={draft.title} />
              <button
                type="button"
                disabled={isSaving || isPending}
                onClick={() => {
                  void handleSave();
                }}
                className="admin-action-primary"
              >
                {isSaving || isPending ? "Speichern..." : "Produkt speichern"}
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="admin-meta-pill">ID {draft.id}</span>
            <span>·</span>
            <span>
              Zuletzt aktualisiert:{" "}
              {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(draft.updatedAt))}
            </span>
          </div>

          {saveError ? <p className="admin-alert admin-alert-error mt-5">{saveError}</p> : null}
          {saveMessage ? <p className="admin-alert admin-alert-success mt-5">{saveMessage}</p> : null}
        </div>

        <Section title="Basisdaten" hint="Shop-relevante Stammdaten und Sichtbarkeit des Produkts.">
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Titel
              <input
                value={draft.title}
                onChange={(event) => {
                  const title = event.target.value;
                  setDraft((current) => ({
                    ...current,
                    title,
                    slug: current.slug === slugify(current.title) ? slugify(title) : current.slug
                  }));
                }}
                className="rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Slug
              <input
                value={draft.slug}
                onChange={(event) => setField("slug", event.target.value)}
                className="rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium lg:col-span-2">
              Kurzbeschreibung
              <textarea
                value={draft.shortDescription}
                onChange={(event) => setField("shortDescription", event.target.value)}
                rows={3}
                className="rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium lg:col-span-2">
              Lange Beschreibung
              <textarea
                value={draft.longDescription}
                onChange={(event) => setField("longDescription", event.target.value)}
                rows={6}
                className="rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Status
              <select
                value={draft.status}
                onChange={(event) => setField("status", event.target.value as EditableProduct["status"])}
                className="rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              >
                <option value="draft">draft</option>
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Badge
              <input
                value={draft.badge ?? ""}
                onChange={(event) => setField("badge", event.target.value || undefined)}
                className="rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Kategorie
              <input
                value={draft.category}
                onChange={(event) => setField("category", event.target.value)}
                className="rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Shop-Kategorie
              <select
                value={draft.shopCategory}
                onChange={(event) => setField("shopCategory", event.target.value)}
                className="rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              >
                {shopCategories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Glasart
              <select
                value={draft.glassType}
                onChange={(event) => setField("glassType", event.target.value)}
                className="rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              >
                {glassTypes.map((glassType) => (
                  <option key={glassType} value={glassType}>
                    {glassType}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Anlass
              <select
                value={draft.occasion}
                onChange={(event) => setField("occasion", event.target.value)}
                className="rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              >
                {occasions.map((occasion) => (
                  <option key={occasion} value={occasion}>
                    {occasion}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Kollektion
              <select
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
                className="rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              >
                {collections.map((collection) => (
                  <option key={collection.slug} value={collection.slug}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Kollektionstitel
              <input
                value={draft.collection}
                onChange={(event) => setField("collection", event.target.value)}
                className="rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Designer
              <input
                value={draft.designer}
                onChange={(event) => setField("designer", event.target.value)}
                className="rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Rating
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={draft.rating}
                onChange={(event) => setField("rating", Number(event.target.value))}
                className="rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Reviews
              <input
                type="number"
                min="0"
                value={draft.reviews}
                onChange={(event) => setField("reviews", Number(event.target.value))}
                className="rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium lg:col-span-2">
              Pflegehinweis
              <textarea
                value={draft.care}
                onChange={(event) => setField("care", event.target.value)}
                rows={3}
                className="rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium lg:col-span-2">
              Benefits
              <textarea
                value={benefitsText}
                onChange={(event) => setField("benefits", splitLines(event.target.value))}
                rows={4}
                className="rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-4 text-sm">
            <label className="admin-chip">
              <input
                type="checkbox"
                checked={draft.featured}
                onChange={(event) => setField("featured", event.target.checked)}
              />
              Featured
            </label>
            <label className="admin-chip">
              <input
                type="checkbox"
                checked={draft.isPersonalizable}
                onChange={(event) => setField("isPersonalizable", event.target.checked)}
              />
              Personalisierbar
            </label>
          </div>
        </Section>

        <Section title="Varianten" hint="Kaufbare Auspraegungen inklusive Preis, Lager und Produktionszeit.">
          <div className="space-y-4">
            {draft.variants.map((variant, index) => (
              <article key={variant.id} className="admin-subpanel rounded-[1.75rem] p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-lg font-semibold">Variante {index + 1}</p>
                  <div className="flex flex-wrap gap-3">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="defaultVariant"
                        checked={draft.defaultVariantId === variant.id}
                        onChange={() => setField("defaultVariantId", variant.id)}
                      />
                      Standard
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={variant.isActive}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            variants: current.variants.map((entry) =>
                              entry.id === variant.id ? { ...entry, isActive: event.target.checked } : entry
                            )
                          }))
                        }
                      />
                      Aktiv
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          variants: current.variants.filter((entry) => entry.id !== variant.id),
                          defaultVariantId:
                            current.defaultVariantId === variant.id
                              ? current.variants.find((entry) => entry.id !== variant.id)?.id
                              : current.defaultVariantId
                        }))
                      }
                      className="admin-action-danger px-4 py-2"
                    >
                      Entfernen
                    </button>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                  <label className="grid gap-2 text-sm font-medium">
                    Name
                    <input
                      value={variant.name}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          variants: current.variants.map((entry) =>
                            entry.id === variant.id ? { ...entry, name: event.target.value } : entry
                          )
                        }))
                      }
                      className="rounded-2xl border border-[var(--line)] px-4 py-3"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    SKU
                    <input
                      value={variant.sku}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          variants: current.variants.map((entry) =>
                            entry.id === variant.id ? { ...entry, sku: event.target.value } : entry
                          )
                        }))
                      }
                      className="rounded-2xl border border-[var(--line)] px-4 py-3"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Preis in Cent
                    <input
                      type="number"
                      min="0"
                      value={variant.priceCents}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          variants: current.variants.map((entry) =>
                            entry.id === variant.id ? { ...entry, priceCents: Number(event.target.value) } : entry
                          )
                        }))
                      }
                      className="rounded-2xl border border-[var(--line)] px-4 py-3"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Vergleichspreis in Cent
                    <input
                      type="number"
                      min="0"
                      value={variant.compareAtPriceCents ?? ""}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          variants: current.variants.map((entry) =>
                            entry.id === variant.id
                              ? { ...entry, compareAtPriceCents: asOptionalNumber(event.target.value) }
                              : entry
                          )
                        }))
                      }
                      className="rounded-2xl border border-[var(--line)] px-4 py-3"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Lager-Modus
                    <select
                      value={variant.stockMode}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          variants: current.variants.map((entry) =>
                            entry.id === variant.id
                              ? {
                                  ...entry,
                                  stockMode: event.target.value as EditableVariant["stockMode"],
                                  stockQuantity:
                                    event.target.value === "tracked" ? entry.stockQuantity ?? 0 : undefined
                                }
                              : entry
                          )
                        }))
                      }
                      className="rounded-2xl border border-[var(--line)] px-4 py-3"
                    >
                      <option value="unlimited">unlimited</option>
                      <option value="tracked">tracked</option>
                      <option value="made_to_order">made_to_order</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Lagerbestand
                    <input
                      type="number"
                      min="0"
                      disabled={variant.stockMode !== "tracked"}
                      value={variant.stockQuantity ?? ""}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          variants: current.variants.map((entry) =>
                            entry.id === variant.id ? { ...entry, stockQuantity: asOptionalNumber(event.target.value) } : entry
                          )
                        }))
                      }
                      className="rounded-2xl border border-[var(--line)] px-4 py-3 disabled:opacity-50"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Gewicht in Gramm
                    <input
                      type="number"
                      min="0"
                      value={variant.weightGrams ?? ""}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          variants: current.variants.map((entry) =>
                            entry.id === variant.id ? { ...entry, weightGrams: asOptionalNumber(event.target.value) } : entry
                          )
                        }))
                      }
                      className="rounded-2xl border border-[var(--line)] px-4 py-3"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Produktionstage
                    <input
                      type="number"
                      min="0"
                      value={variant.productionTimeDays}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          variants: current.variants.map((entry) =>
                            entry.id === variant.id ? { ...entry, productionTimeDays: Number(event.target.value) } : entry
                          )
                        }))
                      }
                      className="rounded-2xl border border-[var(--line)] px-4 py-3"
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                variants: [
                  ...current.variants,
                  {
                    id: createId("variant"),
                    sku: `${current.id.toUpperCase()}-${current.variants.length + 1}`,
                    name: `Variante ${current.variants.length + 1}`,
                    priceCents: current.variants[0]?.priceCents ?? 0,
                    currency: "EUR",
                    stockMode: "unlimited",
                    isActive: true,
                    productionTimeDays: current.variants[0]?.productionTimeDays ?? 3,
                    sortOrder: current.variants.length,
                    createdAt: current.updatedAt,
                    updatedAt: current.updatedAt
                  }
                ],
                defaultVariantId: current.defaultVariantId ?? current.variants[0]?.id
              }))
            }
            className="admin-action-secondary mt-5"
          >
            Variante hinzufügen
          </button>
        </Section>

        <Section title="Bilder" hint="Produktbilder fuer Shop und Galerie. Ein Bild sollte als Primary markiert sein.">
          <div className="space-y-4">
            {draft.images.map((image, index) => (
              <article key={image.id} className="admin-subpanel rounded-[1.75rem] p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-lg font-semibold">Bild {index + 1}</p>
                  <div className="flex flex-wrap gap-3">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="primaryImage"
                        checked={image.isPrimary}
                        onChange={() =>
                          setDraft((current) => ({
                            ...current,
                            images: current.images.map((entry) => ({
                              ...entry,
                              isPrimary: entry.id === image.id
                            }))
                          }))
                        }
                      />
                      Primary
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          images: current.images.filter((entry) => entry.id !== image.id)
                        }))
                      }
                      className="admin-action-danger px-4 py-2"
                    >
                      Entfernen
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium lg:col-span-2">
                    Bild-URL
                    <input
                      value={image.url}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          images: current.images.map((entry) =>
                            entry.id === image.id ? { ...entry, url: event.target.value } : entry
                          )
                        }))
                      }
                      className="rounded-2xl border border-[var(--line)] px-4 py-3"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Storage-Pfad
                    <input
                      value={image.storagePath ?? ""}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          images: current.images.map((entry) =>
                            entry.id === image.id ? { ...entry, storagePath: event.target.value || undefined } : entry
                          )
                        }))
                      }
                      className="rounded-2xl border border-[var(--line)] px-4 py-3"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Alt-Text
                    <input
                      value={image.altText}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          images: current.images.map((entry) =>
                            entry.id === image.id ? { ...entry, altText: event.target.value } : entry
                          )
                        }))
                      }
                      className="rounded-2xl border border-[var(--line)] px-4 py-3"
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                images: [
                  ...current.images,
                  {
                    id: createId("image"),
                    url: "",
                    storagePath: "",
                    altText: current.title,
                    sortOrder: current.images.length,
                    isPrimary: current.images.length === 0,
                    createdAt: current.updatedAt
                  }
                ]
              }))
            }
            className="admin-action-secondary mt-5"
          >
            Bild hinzufügen
          </button>
        </Section>

        <Section title="Personalisierung" hint="Optionen fuer Wunschtext, Auswahlfelder, Checkboxen und Dateiuploads.">
          <div className="space-y-4">
            {draft.options.map((option, optionIndex) => (
              <article key={option.id} className="admin-subpanel rounded-[1.75rem] p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-lg font-semibold">Option {optionIndex + 1}</p>
                  <div className="flex flex-wrap gap-3">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={option.isRequired}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            options: current.options.map((entry) =>
                              entry.id === option.id ? { ...entry, isRequired: event.target.checked } : entry
                            )
                          }))
                        }
                      />
                      Pflichtfeld
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={option.isActive}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            options: current.options.map((entry) =>
                              entry.id === option.id ? { ...entry, isActive: event.target.checked } : entry
                            )
                          }))
                        }
                      />
                      Aktiv
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          options: current.options.filter((entry) => entry.id !== option.id)
                        }))
                      }
                      className="admin-action-danger px-4 py-2"
                    >
                      Entfernen
                    </button>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                  <label className="grid gap-2 text-sm font-medium">
                    Name
                    <input
                      value={option.name}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          options: current.options.map((entry) =>
                            entry.id === option.id
                              ? {
                                  ...entry,
                                  name: event.target.value,
                                  code: entry.code === slugify(entry.name) ? slugify(event.target.value) : entry.code
                                }
                              : entry
                          )
                        }))
                      }
                      className="rounded-2xl border border-[var(--line)] px-4 py-3"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Code
                    <input
                      value={option.code}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          options: current.options.map((entry) =>
                            entry.id === option.id ? { ...entry, code: event.target.value } : entry
                          )
                        }))
                      }
                      className="rounded-2xl border border-[var(--line)] px-4 py-3"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Typ
                    <select
                      value={option.type}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          options: current.options.map((entry) =>
                            entry.id === option.id
                              ? {
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
                                }
                              : entry
                          )
                        }))
                      }
                      className="rounded-2xl border border-[var(--line)] px-4 py-3"
                    >
                      <option value="text">text</option>
                      <option value="textarea">textarea</option>
                      <option value="select">select</option>
                      <option value="checkbox">checkbox</option>
                      <option value="file">file</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium lg:col-span-3">
                    Hilfetext
                    <input
                      value={option.helpText ?? ""}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          options: current.options.map((entry) =>
                            entry.id === option.id ? { ...entry, helpText: event.target.value || undefined } : entry
                          )
                        }))
                      }
                      className="rounded-2xl border border-[var(--line)] px-4 py-3"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Placeholder
                    <input
                      value={option.placeholder ?? ""}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          options: current.options.map((entry) =>
                            entry.id === option.id ? { ...entry, placeholder: event.target.value || undefined } : entry
                          )
                        }))
                      }
                      className="rounded-2xl border border-[var(--line)] px-4 py-3"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Max-Length
                    <input
                      type="number"
                      min="0"
                      value={option.maxLength ?? ""}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          options: current.options.map((entry) =>
                            entry.id === option.id ? { ...entry, maxLength: asOptionalNumber(event.target.value) } : entry
                          )
                        }))
                      }
                      className="rounded-2xl border border-[var(--line)] px-4 py-3"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Preisaufschlag in Cent
                    <input
                      type="number"
                      value={option.priceModifierCents ?? 0}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          options: current.options.map((entry) =>
                            entry.id === option.id ? { ...entry, priceModifierCents: Number(event.target.value) } : entry
                          )
                        }))
                      }
                      className="rounded-2xl border border-[var(--line)] px-4 py-3"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Pricing-Modus
                    <select
                      value={option.pricingMode}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          options: current.options.map((entry) =>
                            entry.id === option.id
                              ? { ...entry, pricingMode: event.target.value as EditableOption["pricingMode"] }
                              : entry
                          )
                        }))
                      }
                      className="rounded-2xl border border-[var(--line)] px-4 py-3"
                    >
                      <option value="none">none</option>
                      <option value="fixed">fixed</option>
                      <option value="per_character">per_character</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium lg:col-span-2">
                    Erlaubte MIME-Typen
                    <input
                      value={joinCommaList(option.acceptedMimeTypes)}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          options: current.options.map((entry) =>
                            entry.id === option.id ? { ...entry, acceptedMimeTypes: splitCommaList(event.target.value) } : entry
                          )
                        }))
                      }
                      className="rounded-2xl border border-[var(--line)] px-4 py-3"
                    />
                  </label>
                </div>

                {option.type === "select" ? (
                  <div className="admin-nested-panel mt-5 rounded-[1.5rem] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--text)]">Select-Werte</p>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            options: current.options.map((entry) =>
                              entry.id === option.id
                                ? {
                                    ...entry,
                                    values: [
                                      ...entry.values,
                                      {
                                        id: createId("value"),
                                        label: `Option ${entry.values.length + 1}`,
                                        value: `option-${entry.values.length + 1}`,
                                        sortOrder: entry.values.length,
                                        priceModifierCents: 0,
                                        isActive: true
                                      }
                                    ]
                                  }
                                : entry
                            )
                          }))
                        }
                        className="admin-action-secondary px-4 py-2"
                      >
                        Wert hinzufügen
                      </button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {option.values.map((value) => (
                        <div key={value.id} className="admin-subpanel grid gap-3 rounded-[1.25rem] p-4 lg:grid-cols-[1fr_1fr_180px_auto_auto]">
                          <input
                            value={value.label}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                options: current.options.map((entry) =>
                                  entry.id === option.id
                                    ? {
                                        ...entry,
                                        values: entry.values.map((valueEntry) =>
                                          valueEntry.id === value.id ? { ...valueEntry, label: event.target.value } : valueEntry
                                        )
                                      }
                                    : entry
                                )
                              }))
                            }
                            placeholder="Label"
                            className="rounded-2xl border border-[var(--line)] px-4 py-3"
                          />
                          <input
                            value={value.value}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                options: current.options.map((entry) =>
                                  entry.id === option.id
                                    ? {
                                        ...entry,
                                        values: entry.values.map((valueEntry) =>
                                          valueEntry.id === value.id ? { ...valueEntry, value: event.target.value } : valueEntry
                                        )
                                      }
                                    : entry
                                )
                              }))
                            }
                            placeholder="Wert"
                            className="rounded-2xl border border-[var(--line)] px-4 py-3"
                          />
                          <input
                            type="number"
                            value={value.priceModifierCents ?? 0}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                options: current.options.map((entry) =>
                                  entry.id === option.id
                                    ? {
                                        ...entry,
                                        values: entry.values.map((valueEntry) =>
                                          valueEntry.id === value.id
                                            ? { ...valueEntry, priceModifierCents: Number(event.target.value) }
                                            : valueEntry
                                        )
                                      }
                                    : entry
                                )
                              }))
                            }
                            className="rounded-2xl border border-[var(--line)] px-4 py-3"
                          />
                          <label className="inline-flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={value.isActive}
                              onChange={(event) =>
                                setDraft((current) => ({
                                  ...current,
                                  options: current.options.map((entry) =>
                                    entry.id === option.id
                                      ? {
                                          ...entry,
                                          values: entry.values.map((valueEntry) =>
                                            valueEntry.id === value.id ? { ...valueEntry, isActive: event.target.checked } : valueEntry
                                          )
                                        }
                                      : entry
                                  )
                                }))
                              }
                            />
                            Aktiv
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setDraft((current) => ({
                                ...current,
                                options: current.options.map((entry) =>
                                  entry.id === option.id
                                    ? { ...entry, values: entry.values.filter((valueEntry) => valueEntry.id !== value.id) }
                                    : entry
                                )
                              }))
                            }
                            className="admin-action-danger px-4 py-2"
                          >
                            Entfernen
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                options: [
                  ...current.options,
                  {
                    id: createId("option"),
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
                ]
              }))
            }
            className="admin-action-secondary mt-5"
          >
            Option hinzufügen
          </button>
        </Section>
      </div>
    </section>
  );
}
