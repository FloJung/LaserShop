"use client";

import clsx from "clsx";
import { useState } from "react";
import { useRouter } from "next/navigation";

type AdminDeleteProductButtonProps = {
  productId: string;
  productTitle: string;
  compact?: boolean;
  onBeforeDelete?: () => boolean;
};

export function AdminDeleteProductButton({
  productId,
  productTitle,
  compact = false,
  onBeforeDelete
}: AdminDeleteProductButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (onBeforeDelete && !onBeforeDelete()) {
      return;
    }

    const confirmed = window.confirm(`Produkt "${productTitle}" wirklich loeschen?`);
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
        setError(payload?.error ?? "Produkt konnte nicht geloescht werden.");
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
        className={clsx("admin-action-danger", compact && "!px-3.5 !py-2.5 !text-sm")}
      >
        {isLoading ? "Loeschen..." : "Produkt loeschen"}
      </button>
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
