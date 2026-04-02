import Link from "next/link";
import { AdminCreateProductButton } from "@/components/admin-create-product-button";
import type { AdminProductSummary } from "@/lib/server/admin-products";

type AdminProductsOverviewProps = {
  products: AdminProductSummary[];
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getStatusClasses(status: AdminProductSummary["status"]) {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "archived") {
    return "border-stone-200 bg-stone-100 text-stone-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

export function AdminProductsOverview({ products }: AdminProductsOverviewProps) {
  const activeCount = products.filter((product) => product.status === "active").length;
  const draftCount = products.filter((product) => product.status === "draft").length;
  const featuredCount = products.filter((product) => product.featured).length;
  const variantTotal = products.reduce((sum, product) => sum + product.variantCount, 0);

  return (
    <section className="section">
      <div className="shell space-y-6">
        <div className="rounded-3xl border border-[var(--line)] bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">Admin Products</p>
              <h1 className="mt-3 text-3xl font-bold">Produkte verwalten</h1>
              <p className="mt-3 max-w-3xl text-[var(--text-soft)]">
                Geschuetzte Produktverwaltung fuer Live-Katalog, Varianten, Bilder und Personalisierungsoptionen.
              </p>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              Zurueck zum Admin
            </Link>
            <AdminCreateProductButton />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Produkte gesamt", value: String(products.length) },
            { label: "Aktiv", value: String(activeCount) },
            { label: "Entwuerfe", value: String(draftCount) },
            { label: "Varianten", value: String(variantTotal) },
            { label: "Featured", value: String(featuredCount) }
          ].map((card) => (
            <article key={card.label} className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{card.label}</p>
              <p className="mt-3 text-3xl font-bold text-[var(--text)]">{card.value}</p>
            </article>
          ))}
        </div>

        <div className="overflow-hidden rounded-3xl border border-[var(--line)] bg-white shadow-sm">
          <div className="grid grid-cols-[72px_1.8fr_1fr_0.9fr_0.8fr] gap-4 border-b border-[var(--line)] bg-slate-50/80 px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)] max-md:hidden">
            <span>Nr.</span>
            <span>Produkt</span>
            <span>Katalog</span>
            <span>Status</span>
            <span className="text-right">Aktion</span>
          </div>

          <div className="divide-y divide-[var(--line)]">
            {products.map((product, index) => (
              <article
                key={product.id}
                className={`grid gap-5 px-6 py-5 transition-colors md:grid-cols-[72px_1.8fr_1fr_0.9fr_0.8fr] md:items-center ${
                  index % 2 === 0 ? "bg-white" : "bg-zinc-200"
                }`}
              >
                <div className="flex items-center gap-3 md:block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)] md:hidden">
                    Nr.
                  </span>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--line)] bg-white text-sm font-semibold text-[var(--text)] shadow-sm">
                    {index + 1}
                  </span>
                </div>

                <div>
                  <p className="text-lg font-semibold text-[var(--text)]">{product.title}</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">
                    ID {product.id} &middot; /{product.slug} &middot; {product.variantCount} Varianten
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-soft)]">Zuletzt aktualisiert: {formatDateTime(product.updatedAt)}</p>
                </div>

                <div className="text-sm text-[var(--text-soft)]">
                  <p>{product.collection}</p>
                  <p className="mt-1">
                    {product.shopCategory} &middot; {product.glassType}
                  </p>
                  <p className="mt-1">{product.category}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${getStatusClasses(product.status)}`}>
                    {product.status}
                  </span>
                  {product.featured ? (
                    <span className="rounded-full border border-[var(--line)] bg-[var(--sand)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text)]">
                      featured
                    </span>
                  ) : null}
                </div>

                <div className="flex md:justify-end">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="inline-flex items-center justify-center rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
                  >
                    Bearbeiten
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
