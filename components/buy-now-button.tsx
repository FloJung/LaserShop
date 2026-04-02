"use client";

import { CreditCard } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/button";

export function BuyNowButton({
  productId,
  variantId,
  quantity = 1,
  className
}: {
  productId: string;
  variantId: string;
  quantity?: number;
  className?: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productId,
          variantId,
          quantity
        })
      });

      const payload = (await response.json().catch(() => null)) as { checkoutUrl?: string; error?: string } | null;
      if (!response.ok || !payload?.checkoutUrl) {
        throw new Error(payload?.error ?? "Checkout konnte nicht erstellt werden.");
      }

      window.location.href = payload.checkoutUrl;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Checkout konnte nicht erstellt werden.");
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button className={className} variant="secondary" onClick={handleClick} disabled={isLoading}>
        <CreditCard size={16} />
        <span>{isLoading ? "Weiterleitung..." : "Jetzt kaufen"}</span>
      </Button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
