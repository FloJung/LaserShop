"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/button";
import { useCart } from "@/components/cart-provider";
import { getSafeCartItemImage } from "@/lib/cart";
import { formatPrice } from "@/lib/shop";

export function CartPage() {
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-[var(--line)] bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold">Dein Warenkorb ist leer</h2>
        <p className="mt-3 max-w-xl text-[var(--text-soft)]">
          Lege gravierte Produkte oder einen selbst gestalteten Glasuntersätzer in den Warenkorb, um hier eine Vorschau zu sehen.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
          >
            Zum Shop
          </Link>
          <Link
            href="/untersetzer-editor"
            className="inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold transition hover:border-[var(--brand)]"
          >
            Untersetzer gestalten
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        {items.map((item) => {
          const safeImage = getSafeCartItemImage(item);

          return (
            <article key={item.id} className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-sm">
              <div className="grid gap-5 md:grid-cols-[160px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-2xl bg-[var(--muted-surface)]">
                  {item.previewImage ? (
                    <img src={item.previewImage} alt={item.name} className="aspect-square h-full w-full object-cover" />
                  ) : (
                    <div className="relative aspect-square">
                      <Image src={safeImage} alt={item.name} fill className="object-cover" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-semibold">{item.name}</p>
                      {item.subtitle ? <p className="mt-1 text-sm text-[var(--text-soft)]">{item.subtitle}</p> : null}
                      {item.lineType === "custom-design" ? (
                        <p className="mt-2 text-sm font-medium text-[var(--brand)]">
                          Custom-Design mit gespeicherter JSON- und PNG-Vorschau
                        </p>
                      ) : null}
                    </div>
                    <p className="text-xl font-bold">{formatPrice(item.price)}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 rounded-full bg-[var(--muted-surface)] p-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="rounded-full bg-white p-2 transition hover:text-[var(--brand)]"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="rounded-full bg-white p-2 transition hover:text-[var(--brand)]"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-soft)] transition hover:text-[var(--brand)]"
                    >
                      <Trash2 size={15} />
                      Entfernen
                    </button>
                  </div>

                  {item.lineType === "custom-design" ? (
                    <Link href="/untersetzer-editor" className="text-sm font-semibold text-[var(--brand)]">
                      Design erneut bearbeiten
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <aside className="h-fit rounded-3xl border border-[var(--line)] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">Zusammenfassung</p>
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-soft)]">Zwischensumme</span>
            <span className="font-semibold">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-soft)]">Versand</span>
            <span className="font-semibold">{subtotal >= 69 ? "Kostenlos" : "4,90 EUR"}</span>
          </div>
        </div>

        <div className="mt-5 border-t border-[var(--line)] pt-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-soft)]">Gesamt</span>
            <span className="text-2xl font-bold">{formatPrice(subtotal >= 69 ? subtotal : subtotal + 4.9)}</span>
          </div>
        </div>

        <Button className="mt-6 w-full">Zur Kasse</Button>
        <Button variant="secondary" className="mt-3 w-full" onClick={clearCart}>
          Warenkorb leeren
        </Button>
      </aside>
    </div>
  );
}
