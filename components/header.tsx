"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ShoppingCart, Search, PackageSearch, Gift, LayoutGrid, ChevronDown, Menu, X } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { Logo } from "@/components/logo";
import { MobileMenuAccordion } from "@/components/mobile-menu-accordion";
import type { DesignerCollection, ShopCategory } from "@/lib/types";
import { useMobileHeaderVisibility } from "@/lib/use-mobile-header-visibility";

const quickLinks = [
  { label: "Shop", href: "/shop", icon: LayoutGrid },
  { label: "Geschenkideen", href: "/shop?occasion=Hochzeit", icon: Gift }
];

export function Header({
  collections,
  shopCategories
}: {
  collections: DesignerCollection[];
  shopCategories: ShopCategory[];
}) {
  const { count } = useCart();
  const { isHeaderVisible } = useMobileHeaderVisibility();
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const mobileMenuId = useId();
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    if (!isMobileMenuOpen) {
      setIsCollectionsOpen(false);
      setIsCategoriesOpen(false);
    }

    if (!isMobileMenuOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      if (mobileMenuPanelRef.current?.contains(target) || mobileMenuButtonRef.current?.contains(target)) {
        return;
      }

      setIsMobileMenuOpen(false);
    };

    const focusableElements = mobileMenuPanelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    focusableElements?.[0]?.focus();
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.body.style.removeProperty("overflow");
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      mobileMenuButtonRef.current?.focus();
    };
  }, [isMobileMenuOpen, isMounted]);

  const mobileMenuOverlay =
    isMounted &&
    createPortal(
      <div
        className={clsx(
          "fixed inset-0 z-[80] md:hidden",
          isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!isMobileMenuOpen}
      >
        <button
          type="button"
          aria-label="Menü schließen"
          className={clsx(
            "absolute inset-0 bg-[rgba(17,24,39,0.36)] transition-opacity duration-300 ease-out",
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => {
            setIsMobileMenuOpen(false);
          }}
        />

        <div
          id={mobileMenuId}
          ref={mobileMenuPanelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Mobiles Menü"
          className={clsx(
            "absolute right-0 top-0 flex h-dvh w-[min(24rem,100vw)] max-w-sm flex-col border-l border-[var(--line)] bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Menü</p>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] text-[var(--text)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
              onClick={() => {
                setIsMobileMenuOpen(false);
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-2">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="flex items-center justify-between rounded-2xl border border-[var(--line)] px-4 py-3 text-sm font-medium text-[var(--text)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={16} />
                      <span>{link.label}</span>
                    </span>
                  </Link>
                );
              })}

              <Link
                href="/cart"
                className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--muted-surface)] px-4 py-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                }}
              >
                <span className="flex items-center gap-3">
                  <ShoppingCart size={16} />
                  <span>Warenkorb</span>
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[var(--text-soft)]">
                  {count}
                </span>
              </Link>
            </div>

            <div className="mt-6 space-y-3">
              <MobileMenuAccordion
                title="Kollektionen"
                isOpen={isCollectionsOpen}
                onToggle={() => {
                  setIsCollectionsOpen((open) => !open);
                }}
              >
                <div className="space-y-2">
                  {collections.map((collection) => (
                    <Link
                      key={collection.slug}
                      href={`/collections/${collection.slug}`}
                      className="block rounded-xl px-3 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--muted-surface)] hover:text-[var(--brand)]"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      {collection.name}
                    </Link>
                  ))}
                </div>
              </MobileMenuAccordion>

              <MobileMenuAccordion
                title="Kategorien"
                isOpen={isCategoriesOpen}
                onToggle={() => {
                  setIsCategoriesOpen((open) => !open);
                }}
              >
                <div className="space-y-2">
                  {shopCategories.map((category) => (
                    <Link
                      key={category.slug}
                      href={`/category/${category.slug}`}
                      className="block rounded-xl px-3 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--muted-surface)] hover:text-[var(--brand)]"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </MobileMenuAccordion>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <>
      <header
        className={clsx(
          "sticky top-0 z-40 border-b border-[var(--line)] bg-white/90 backdrop-blur",
          "max-md:transform-gpu max-md:will-change-transform max-md:transition-[transform,opacity] max-md:duration-[420ms] max-md:ease-[cubic-bezier(0.22,1,0.36,1)]",
          !isHeaderVisible && "max-md:pointer-events-none max-md:-translate-y-full max-md:opacity-0"
        )}
      >
        <div className="hidden border-b border-[var(--line)] bg-[var(--text)] text-white md:block">
          <div className="shell flex items-center justify-between py-2 text-sm">
            <p>Präzise Lasergravur auf Premium-Gläsern</p>
            <p className="hidden md:block">Kostenloser Versand ab 69 EUR</p>
          </div>
        </div>

        <div className="shell flex flex-wrap items-center gap-3 py-3 md:gap-4 md:py-4">
          <div className="shrink-0 md:order-1">
            <Logo />
          </div>

          <div className="order-2 ml-auto md:hidden">
            <button
              ref={mobileMenuButtonRef}
              type="button"
              aria-expanded={isMobileMenuOpen}
              aria-controls={mobileMenuId}
              aria-label={isMobileMenuOpen ? "Menü schließen" : "Menü öffnen"}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--text)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
              onClick={() => {
                setIsMobileMenuOpen((open) => !open);
              }}
            >
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[var(--brand)] px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-white">
                {count}
              </span>
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          <nav className="order-3 hidden items-center gap-2 md:order-3 md:ml-0 md:flex md:flex-nowrap">
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

              <div className="absolute left-1/2 top-[calc(100%+0.6rem)] z-50 hidden w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-[var(--line)] bg-white p-2 shadow-xl md:left-auto md:right-0 md:top-[calc(100%+0.55rem)] md:w-auto md:min-w-64 md:translate-x-0">
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

          <form action="/shop" method="get" className="order-4 relative basis-full md:order-2 md:min-w-[260px] md:flex-1">
            <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" />
            <input
              type="search"
              name="search"
              placeholder="Design, Kollektion oder Glasart suchen"
              className="w-full rounded-full border border-[var(--line)] bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[var(--brand)] focus:shadow-[0_0_0_2px_rgba(231,119,44,0.2)]"
            />
          </form>
        </div>

        <div className="hidden border-t border-[var(--line)] bg-white md:block">
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
      {mobileMenuOverlay}
    </>
  );
}

