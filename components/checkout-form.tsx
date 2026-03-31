"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/button";
import { useCart } from "@/components/cart-provider";
import { buildCheckoutRequest } from "@/lib/cart";
import { isFirebaseClientConfigured } from "@/lib/firebase/env";
import { createOrderWithBackend, validateCartWithBackend } from "@/lib/firebase/checkout";
import { formatPrice } from "@/lib/money";
import { fromCents } from "@/shared/catalog";

type CheckoutFormState = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  line1: string;
  line2: string;
  postalCode: string;
  city: string;
  countryCode: string;
  notesCustomer: string;
};

const INITIAL_STATE: CheckoutFormState = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  line1: "",
  line2: "",
  postalCode: "",
  city: "",
  countryCode: "AT",
  notesCustomer: ""
};

function buildPayload(items: ReturnType<typeof useCart>["items"], state: CheckoutFormState) {
  return buildCheckoutRequest({
    items,
    customer: {
      email: state.email,
      firstName: state.firstName,
      lastName: state.lastName,
      phone: state.phone || undefined
    },
    shippingAddress: {
      firstName: state.firstName,
      lastName: state.lastName,
      line1: state.line1,
      line2: state.line2 || undefined,
      postalCode: state.postalCode,
      city: state.city,
      countryCode: state.countryCode,
      phone: state.phone || undefined
    },
    notesCustomer: state.notesCustomer || undefined
  });
}

export function CheckoutForm() {
  const { items, subtotal, clearCart } = useCart();
  const [form, setForm] = useState(INITIAL_STATE);
  const [serverQuote, setServerQuote] = useState<{
    subtotalCents: number;
    shippingTotalCents: number;
    grandTotalCents: number;
    taxTotalCents: number;
    maxProductionTimeDays: number;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    orderNumber: string;
    orderId: string;
    grandTotalCents: number;
  } | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-[var(--line)] bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold">Kein Checkout ohne Warenkorb</h2>
        <p className="mt-3 text-[var(--text-soft)]">
          Lege zuerst Produkte oder deinen individuell gestalteten Untersetzer in den Warenkorb.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
          >
            Zum Shop
          </Link>
          <Link
            href="/cart"
            className="inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold transition hover:border-[var(--brand)]"
          >
            Zum Warenkorb
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-3xl border border-[var(--line)] bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">Bestellung erstellt</p>
        <h2 className="mt-3 text-3xl font-bold">Bestellnummer {success.orderNumber}</h2>
        <p className="mt-3 text-[var(--text-soft)]">
          Die Order wurde im Firebase-Backend gespeichert. Zahlungsintegration kann darauf jetzt sauber aufsetzen.
        </p>
        <p className="mt-5 text-lg font-semibold">{formatPrice(fromCents(success.grandTotalCents))}</p>
        <p className="mt-2 text-sm text-[var(--text-soft)]">Interne Order-ID: {success.orderId}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
          >
            Weiter shoppen
          </Link>
        </div>
      </div>
    );
  }

  const backendReady = isFirebaseClientConfigured();

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-3xl border border-[var(--line)] bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold">E-Mail</span>
            <input
              className="w-full rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Telefon</span>
            <input
              className="w-full rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Vorname</span>
            <input
              className="w-full rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              value={form.firstName}
              onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Nachname</span>
            <input
              className="w-full rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              value={form.lastName}
              onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold">Adresse</span>
            <input
              className="w-full rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              value={form.line1}
              onChange={(event) => setForm((current) => ({ ...current, line1: event.target.value }))}
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold">Adresszusatz</span>
            <input
              className="w-full rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              value={form.line2}
              onChange={(event) => setForm((current) => ({ ...current, line2: event.target.value }))}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">PLZ</span>
            <input
              className="w-full rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              value={form.postalCode}
              onChange={(event) => setForm((current) => ({ ...current, postalCode: event.target.value }))}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Stadt</span>
            <input
              className="w-full rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              value={form.city}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Land</span>
            <input
              className="w-full rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              value={form.countryCode}
              onChange={(event) => setForm((current) => ({ ...current, countryCode: event.target.value.toUpperCase() }))}
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold">Hinweis zur Bestellung</span>
            <textarea
              rows={4}
              className="w-full rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)]"
              value={form.notesCustomer}
              onChange={(event) => setForm((current) => ({ ...current, notesCustomer: event.target.value }))}
            />
          </label>
        </div>

        {!backendReady ? (
          <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Firebase ist im Frontend noch nicht konfiguriert. Checkout-Functions sind vorbereitet, aber ohne
            `NEXT_PUBLIC_FIREBASE_*`-Variablen nicht aufrufbar.
          </p>
        ) : null}

        {error ? (
          <p className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={!backendReady || isValidating || isSubmitting}
            onClick={async () => {
              setError(null);
              setIsValidating(true);

              try {
                const result = await validateCartWithBackend(buildPayload(items, form));
                setServerQuote({
                  subtotalCents: result.totals.subtotalCents,
                  shippingTotalCents: result.totals.shippingTotalCents,
                  grandTotalCents: result.totals.grandTotalCents,
                  taxTotalCents: result.totals.taxTotalCents,
                  maxProductionTimeDays: result.maxProductionTimeDays
                });
              } catch (caughtError) {
                setError(caughtError instanceof Error ? caughtError.message : "Serverpruefung fehlgeschlagen.");
              } finally {
                setIsValidating(false);
              }
            }}
          >
            {isValidating ? "Pruefe..." : "Serverpreis pruefen"}
          </Button>

          <Button
            type="button"
            disabled={!backendReady || isSubmitting}
            onClick={async () => {
              setError(null);
              setIsSubmitting(true);

              try {
                const result = await createOrderWithBackend(buildPayload(items, form));
                clearCart();
                setSuccess({
                  orderId: result.orderId,
                  orderNumber: result.orderNumber,
                  grandTotalCents: result.totals.grandTotalCents
                });
              } catch (caughtError) {
                setError(caughtError instanceof Error ? caughtError.message : "Bestellung konnte nicht erstellt werden.");
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {isSubmitting ? "Erstelle Bestellung..." : "Bestellung anlegen"}
          </Button>
        </div>
      </div>

      <aside className="h-fit rounded-3xl border border-[var(--line)] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">Zusammenfassung</p>
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-soft)]">Clientseitige Zwischensumme</span>
            <span className="font-semibold">{formatPrice(subtotal)}</span>
          </div>
          {serverQuote ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-soft)]">Backend Zwischensumme</span>
                <span className="font-semibold">{formatPrice(fromCents(serverQuote.subtotalCents))}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-soft)]">Versand</span>
                <span className="font-semibold">{formatPrice(fromCents(serverQuote.shippingTotalCents))}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-soft)]">Steueranteil</span>
                <span className="font-semibold">{formatPrice(fromCents(serverQuote.taxTotalCents))}</span>
              </div>
            </>
          ) : null}
        </div>

        <div className="mt-5 border-t border-[var(--line)] pt-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-soft)]">Gesamt</span>
            <span className="text-2xl font-bold">
              {serverQuote ? formatPrice(fromCents(serverQuote.grandTotalCents)) : formatPrice(subtotal >= 69 ? subtotal : subtotal + 4.9)}
            </span>
          </div>
          {serverQuote ? (
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              Produktionszeit laut Backend: bis zu {serverQuote.maxProductionTimeDays} Tage
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
