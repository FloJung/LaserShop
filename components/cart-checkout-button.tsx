"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import { useCart } from "@/components/cart-provider";

export function CartCheckoutButton({ className }: { className?: string }) {
  const { items } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout/create-cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          lines: items
        })
      });

      const payload = (await response.json().catch(() => null)) as { checkoutUrl?: string; error?: string } | null;
      if (!response.ok || !payload?.checkoutUrl) {
        throw new Error(payload?.error ?? "Shopify Checkout konnte nicht erstellt werden.");
      }

      window.location.href = payload.checkoutUrl;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Shopify Checkout konnte nicht erstellt werden.");
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <Button className={className} onClick={handleCheckout} disabled={isLoading}>
        {isLoading ? "Leite zu Shopify weiter..." : "Zur Kasse"}
      </Button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
