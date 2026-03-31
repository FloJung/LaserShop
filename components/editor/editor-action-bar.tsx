"use client";

import { Eye, RotateCcw, Save, ShoppingCart } from "lucide-react";
import { Button } from "@/components/button";

export function EditorActionBar({
  onPreview,
  onReset,
  onSave,
  onAddToCart,
  isSaving,
  isSubmitting
}: {
  onPreview: () => void;
  onReset: () => void;
  onSave: () => void;
  onAddToCart: () => void;
  isSaving?: boolean;
  isSubmitting?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-[var(--line)] bg-white p-4 shadow-sm">
      <Button variant="secondary" onClick={onPreview}>
        <Eye size={16} />
        Vorschau
      </Button>
      <Button variant="secondary" onClick={onReset}>
        <RotateCcw size={16} />
        Zurücksetzen
      </Button>
      <Button variant="secondary" onClick={onSave} disabled={isSaving}>
        <Save size={16} />
        {isSaving ? "Speichert..." : "Design speichern"}
      </Button>
      <Button className="ml-auto" onClick={onAddToCart} disabled={isSubmitting}>
        <ShoppingCart size={16} />
        {isSubmitting ? "Wird vorbereitet..." : "In den Warenkorb"}
      </Button>
    </div>
  );
}
