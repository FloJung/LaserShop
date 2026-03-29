import Link from "next/link";
import type { DesignerCollection } from "@/lib/types";

export function FilterBar({
  glassType,
  collection,
  occasion,
  search,
  collections,
  glassTypes,
  occasions,
  showCollection = true,
  resetHref = "/shop"
}: {
  glassType?: string;
  collection?: string;
  occasion?: string;
  search?: string;
  collections: DesignerCollection[];
  glassTypes: readonly string[];
  occasions: readonly string[];
  showCollection?: boolean;
  resetHref?: string;
}) {
  const baseInput =
    "rounded-full border border-[var(--line)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand)] focus:shadow-[0_0_0_2px_rgba(231,119,44,0.2)]";
  const gridColsClass = showCollection ? "md:grid-cols-4" : "md:grid-cols-3";
  const resetSpanClass = showCollection ? "md:col-span-4" : "md:col-span-3";

  return (
    <form className={`grid gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 ${gridColsClass}`}>
      <input type="search" name="search" placeholder="Suche nach Design oder Name" defaultValue={search} className={baseInput} />

      <select name="glassType" defaultValue={glassType ?? ""} className={baseInput}>
        <option value="">Alle Produktarten</option>
        {glassTypes.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      {showCollection ? (
        <select name="collection" defaultValue={collection ?? ""} className={baseInput}>
          <option value="">Alle Kollektionen</option>
          {collections.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      ) : null}

      <div className="flex gap-2">
        <select name="occasion" defaultValue={occasion ?? ""} className={`${baseInput} flex-1`}>
          <option value="">Alle Anlaesse</option>
          {occasions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <button type="submit" className="rounded-full bg-[var(--text)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black">
          Filtern
        </button>
      </div>

      <div className={resetSpanClass}>
        <Link href={resetHref} className="text-sm font-medium text-[var(--brand)]">
          Filter zuruecksetzen
        </Link>
      </div>
    </form>
  );
}

