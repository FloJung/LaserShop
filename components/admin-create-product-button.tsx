"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminCreateProductButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST"
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; productId?: string } | null;
      if (!response.ok || !payload?.productId) {
        setError(payload?.error ?? "Produkt konnte nicht angelegt werden.");
        return;
      }

      router.push(`/admin/products/${payload.productId}`);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => {
          void handleCreate();
        }}
        disabled={isLoading}
        className="inline-flex items-center justify-center rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? "Produkt wird angelegt..." : "Neues Produkt"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
