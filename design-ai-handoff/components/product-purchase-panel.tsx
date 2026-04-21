"use client";

import { CreditCard, LoaderCircle, ShoppingCart, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/button";
import { useCart } from "@/components/cart-provider";
import { uploadCustomerFile } from "@/lib/firebase/uploads";
import { formatPrice } from "@/lib/money";
import type { Product } from "@/lib/types";
import {
  MAX_UPLOAD_SIZE_BYTES,
  buildPersonalizationConfigurations,
  formatMoney,
  getProductPersonalizationOptions,
  type PersonalizationValueMap,
  type StorefrontOption,
  validatePersonalizationInputs
} from "@/shared/catalog";

type ProductPurchasePanelProps = {
  product: Product;
  options: StorefrontOption[];
};

export function ProductPurchasePanel({ product, options }: ProductPurchasePanelProps) {
  const { addProduct } = useCart();
  const personalizationOptions = useMemo(() => getProductPersonalizationOptions(options), [options]);
  const [values, setValues] = useState<PersonalizationValueMap>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uploadStates, setUploadStates] = useState<Record<string, { pending: boolean; error?: string }>>({});
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const hasPendingUpload = Object.values(uploadStates).some((entry) => entry.pending);

  function updateValue(optionId: string, value: PersonalizationValueMap[string]) {
    setValues((current) => ({
      ...current,
      [optionId]: value
    }));
    setFieldErrors((current) => {
      if (!(optionId in current)) {
        return current;
      }

      const next = { ...current };
      delete next[optionId];
      return next;
    });
    setSubmitError(null);
  }

  async function handleFileSelect(option: StorefrontOption, file?: File | null) {
    if (!file) {
      updateValue(option.id, undefined);
      setUploadStates((current) => ({
        ...current,
        [option.id]: { pending: false }
      }));
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setUploadStates((current) => ({
        ...current,
        [option.id]: {
          pending: false,
          error: `Datei zu gross. Maximal ${Math.round(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024))} MB.`
        }
      }));
      return;
    }

    if (Array.isArray(option.acceptedMimeTypes) && !option.acceptedMimeTypes.includes(file.type)) {
      setUploadStates((current) => ({
        ...current,
        [option.id]: {
          pending: false,
          error: "Dateityp nicht erlaubt."
        }
      }));
      return;
    }

    setUploadStates((current) => ({
      ...current,
      [option.id]: { pending: true }
    }));
    setSubmitError(null);

    try {
      const uploadReference = await uploadCustomerFile(file);
      updateValue(option.id, uploadReference);
      setUploadStates((current) => ({
        ...current,
        [option.id]: { pending: false }
      }));
    } catch (error) {
      setUploadStates((current) => ({
        ...current,
        [option.id]: {
          pending: false,
          error: error instanceof Error ? error.message : "Upload fehlgeschlagen."
        }
      }));
    }
  }

  function validateForm() {
    if (hasPendingUpload) {
      setSubmitError("Bitte warten, bis laufende Uploads abgeschlossen sind.");
      return null;
    }

    const errors = validatePersonalizationInputs(personalizationOptions, values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError("Bitte die Personalisierungsfelder vollstaendig ausfuellen.");
      return null;
    }

    setFieldErrors({});
    setSubmitError(null);
    return buildPersonalizationConfigurations(personalizationOptions, values);
  }

  function handleAddToCart() {
    const configurations = validateForm();
    if (!configurations) {
      return;
    }

    addProduct(product, configurations);
    setIsAdded(true);
    window.setTimeout(() => setIsAdded(false), 1800);
  }

  async function handleBuyNow() {
    const configurations = validateForm();
    if (!configurations) {
      return;
    }

    setIsBuyingNow(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/checkout/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          lineId: `buy-now-${product.id}`,
          lineType: "product",
          productId: product.id,
          variantId: product.defaultVariantId ?? `${product.id}-default`,
          quantity: 1,
          name: product.name,
          price: product.price,
          image: product.primaryImageUrl ?? product.image,
          subtitle: `${product.collection} · ${product.glassType}`,
          configurations
        })
      });

      const payload = (await response.json().catch(() => null)) as { checkoutUrl?: string; error?: string } | null;
      if (!response.ok || !payload?.checkoutUrl) {
        throw new Error(payload?.error ?? "Checkout konnte nicht erstellt werden.");
      }

      window.location.href = payload.checkoutUrl;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Checkout konnte nicht erstellt werden.");
      setIsBuyingNow(false);
    }
  }

  return (
    <div className="space-y-4">
      {personalizationOptions.length > 0 ? (
        <section className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--text)]">Personalisierung</p>
            <p className="text-sm text-[var(--text-soft)]">Die Angaben werden mit dem Produkt in Warenkorb und Bestellung gespeichert.</p>
          </div>

          <div className="space-y-3">
            {personalizationOptions.map((option) => {
              const fieldError = fieldErrors[option.id];
              const uploadState = uploadStates[option.id];
              const value = values[option.id];

              return (
                <label key={option.id} className="block space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text)]">{option.name}</span>
                    {option.isRequired ? <span className="text-[11px] uppercase tracking-[0.12em] text-red-600">required</span> : null}
                    {option.priceModifierCents > 0 ? (
                      <span className="text-[11px] text-[var(--text-soft)]">
                        {option.pricingMode === "per_character" ? `${formatMoney(option.priceModifierCents)}/Zeichen` : `+${formatMoney(option.priceModifierCents)}`}
                      </span>
                    ) : null}
                  </div>

                  {option.type === "text" ? (
                    <input
                      value={typeof value === "string" ? value : ""}
                      onChange={(event) => updateValue(option.id, event.target.value)}
                      placeholder={option.placeholder}
                      maxLength={option.maxLength}
                      className="w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                    />
                  ) : null}

                  {option.type === "textarea" ? (
                    <textarea
                      value={typeof value === "string" ? value : ""}
                      onChange={(event) => updateValue(option.id, event.target.value)}
                      placeholder={option.placeholder}
                      maxLength={option.maxLength}
                      rows={4}
                      className="w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                    />
                  ) : null}

                  {option.type === "select" ? (
                    <select
                      value={typeof value === "string" ? value : ""}
                      onChange={(event) => updateValue(option.id, event.target.value)}
                      className="w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                    >
                      <option value="">Bitte waehlen</option>
                      {option.values.map((entry) => (
                        <option key={entry.id} value={entry.value}>
                          {entry.label}
                          {entry.priceModifierCents > 0 ? ` (+${formatPrice(entry.priceModifierCents / 100)})` : ""}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {option.type === "checkbox" ? (
                    <div className="flex items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={value === true}
                        onChange={(event) => updateValue(option.id, event.target.checked)}
                      />
                      <span>{option.placeholder || option.helpText || option.name}</span>
                    </div>
                  ) : null}

                  {option.type === "file" ? (
                    <div className="space-y-2">
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2 text-sm text-[var(--text)]">
                        {uploadState?.pending ? <LoaderCircle size={15} className="animate-spin" /> : <Upload size={15} />}
                        <span>
                          {value && typeof value === "object" && "originalFilename" in value
                            ? value.originalFilename || "Datei hochgeladen"
                            : "Datei waehlen"}
                        </span>
                        <input
                          type="file"
                          accept={option.acceptedMimeTypes?.length ? option.acceptedMimeTypes.join(",") : undefined}
                          onChange={(event) => {
                            void handleFileSelect(option, event.target.files?.[0]);
                          }}
                          className="hidden"
                        />
                      </label>
                      {value && typeof value === "object" && "uploadId" in value ? (
                        <button
                          type="button"
                          onClick={() => updateValue(option.id, undefined)}
                          className="text-xs font-medium text-[var(--text-soft)] underline"
                        >
                          Datei entfernen
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {option.helpText ? <p className="text-xs text-[var(--text-soft)]">{option.helpText}</p> : null}
                  {typeof value === "string" && option.maxLength ? (
                    <p className="text-[11px] text-[var(--text-soft)]">
                      {value.length}/{option.maxLength}
                    </p>
                  ) : null}
                  {uploadState?.error ? <p className="text-xs text-red-600">{uploadState.error}</p> : null}
                  {fieldError ? <p className="text-xs text-red-600">{fieldError}</p> : null}
                </label>
              );
            })}
          </div>
        </section>
      ) : null}

      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

      <div className="space-y-2">
        <Button className="w-full rounded-2xl" onClick={handleAddToCart} disabled={isBuyingNow || hasPendingUpload}>
          <ShoppingCart size={16} />
          <span>{isAdded ? "Hinzugefuegt" : "In den Warenkorb"}</span>
        </Button>
        <Button className="w-full rounded-2xl" variant="secondary" onClick={() => void handleBuyNow()} disabled={isBuyingNow || hasPendingUpload}>
          {isBuyingNow ? <LoaderCircle size={16} className="animate-spin" /> : <CreditCard size={16} />}
          <span>{isBuyingNow ? "Weiterleitung..." : "Jetzt kaufen"}</span>
        </Button>
      </div>
    </div>
  );
}
