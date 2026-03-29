"use client";

import Link from "next/link";
import { ShoppingCart, Search, PackageSearch, Gift, LayoutGrid, ChevronDown } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { Logo } from "@/components/logo";
import { collections, shopCategories } from "@/lib/data/products";

const quickLinks = [
  { label: "Shop", href: "/shop", icon: LayoutGrid },
  { label: "Geschenkideen", href: "/shop?occasion=Hochzeit", icon: Gift }
];

export function Header() {
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/90 backdrop-blur">
      <div className="border-b border-[var(--line)] bg-[var(--text)] text-white">
        <div className="shell flex items-center justify-between py-2 text-sm">
          <p>Praezise Lasergravur auf Premium-Glaesern</p>
          <p className="hidden md:block">Kostenloser Versand ab 69 EUR</p>
        </div>
      </div>

      <div className="shell flex flex-wrap items-center gap-4 py-4">
        <Logo />

        <form action="/shop" method="get" className="relative min-w-[260px] flex-1">
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" />
          <input
            type="search"
            name="search"
            placeholder="Design, Kollektion oder Glasart suchen"
            className="w-full rounded-full border border-[var(--line)] bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[var(--brand)] focus:shadow-[0_0_0_2px_rgba(231,119,44,0.2)]"
          />
        </form>

        <nav className="flex items-center gap-2">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                href={link.href}
                className="flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-2 text-sm font-medium text-[var(--text)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
              >
                <Icon size={16} />
                <span className="hidden lg:block">{link.label}</span>
              </Link>
            );
          })}

          <details className="relative [&[open]>div]:block">
            <summary className="flex list-none items-center gap-2 rounded-full border border-[var(--line)] px-3 py-2 text-sm font-medium text-[var(--text)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
              <PackageSearch size={16} />
              <span className="hidden lg:block">Kollektionen</span>
              <ChevronDown size={15} className="text-[var(--text-soft)]" />
            </summary>

            <div className="absolute right-0 top-[calc(100%+0.55rem)] z-50 hidden min-w-64 rounded-2xl border border-[var(--line)] bg-white p-2 shadow-xl">
              {collections.map((collection) => (
                <Link
                  key={collection.slug}
                  href={`/collections/${collection.slug}`}
                  className="block rounded-xl px-3 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--muted-surface)] hover:text-[var(--brand)]"
                >
                  {collection.name}
                </Link>
              ))}
            </div>
          </details>

          <Link
            href="/cart"
            className="flex items-center gap-2 rounded-full bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
          >
            <ShoppingCart size={16} />
            <span>Warenkorb ({count})</span>
          </Link>
        </nav>
      </div>

      <div className="border-t border-[var(--line)] bg-white">
        <div className="shell flex flex-wrap items-center gap-2 py-3 text-sm">
          {shopCategories.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className="rounded-full border border-transparent bg-[var(--muted-surface)] px-3 py-1.5 font-medium text-[var(--text-soft)] transition hover:border-[var(--line)] hover:bg-white hover:text-[var(--text)]"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

