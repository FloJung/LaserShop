import { Star } from "lucide-react";

export function Rating({ value, reviews }: { value: number; reviews: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1 text-amber-500">
        <Star size={14} fill="currentColor" />
        <span className="font-semibold">{value.toFixed(1)}</span>
      </div>
      <span className="text-[var(--text-soft)]">({reviews})</span>
    </div>
  );
}

