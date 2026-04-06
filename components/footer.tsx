import Link from "next/link";
import { collections, shopCategories } from "@/lib/data/products";

const serviceLinks: ReadonlyArray<{ label: string; href?: string }> = [
  { label: "Versand & Retoure" },
  { label: "Zahlung & Sicherheit" },
  { label: "Kontakt" },
  { label: "Impressum", href: "/impressum" },
  { label: "AGB", href: "/agb" }
];

export function Footer() {
  return (
    <footer className="mt-10 border-t border-[var(--line)] bg-white">
      <div className="shell grid gap-8 py-12 md:grid-cols-4">
        <div>
          <p className="font-[var(--font-serif)] text-2xl">Laser Shop</p>
          <p className="mt-3 text-sm text-[var(--text-soft)]">
            Premium-E-Commerce für gravierte Gläser, passende Accessoires und kuratierte Geschenksets.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Kategorien</p>
          <ul className="mt-3 space-y-2 text-sm">
            {shopCategories.map((category) => (
              <li key={category.slug}>
                <Link href={`/category/${category.slug}`} className="hover:text-[var(--brand)]">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Kollektionen</p>
          <ul className="mt-3 space-y-2 text-sm">
            {collections.map((collection) => (
              <li key={collection.slug}>
                <Link href={`/collections/${collection.slug}`} className="hover:text-[var(--brand)]">
                  {collection.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Service</p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-soft)]">
            {serviceLinks.map((item) => (
              <li key={item.label}>
                {item.href ? (
                  <Link href={item.href} className="transition hover:text-[var(--brand)]">
                    {item.label}
                  </Link>
                ) : (
                  <span>{item.label}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--line)] py-4 text-center text-xs text-[var(--text-soft)]">
        Copyright {new Date().getFullYear()} Laser Shop. Alle Rechte vorbehalten.
      </div>
    </footer>
  );
}
