"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AdminDeleteProductButtonProps = {
  productId: string;
  productTitle: string;
};

export function AdminDeleteProductButton({ productId, productTitle }: AdminDeleteProductButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(`Produkt "${productTitle}" wirklich löschen?`);
    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE"
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? "Produkt konnte nicht gelöscht werden.");
        return;
      }

      router.push("/admin/products");
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
          void handleDelete();
        }}
        disabled={isLoading}
        className="admin-action-danger"
      >
        {isLoading ? "Loeschen..." : "Produkt loeschen"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
