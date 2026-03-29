import Image from "next/image";
import { notFound } from "next/navigation";
import { FilterBar } from "@/components/filter-bar";
import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import { collections, glassTypes, occasions } from "@/lib/data/products";
import { filterProducts } from "@/lib/shop";

export function generateStaticParams() {
  return collections.map((collection) => ({ slug: collection.slug }));
}

export default async function CollectionPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const readParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const { slug } = await params;
  const query = await searchParams;
  const collection = collections.find((item) => item.slug === slug);

  if (!collection) {
    notFound();
  }

  const filters = {
    search: readParam(query.search),
    glassType: readParam(query.glassType),
    occasion: readParam(query.occasion)
  };

  const items = filterProducts({
    ...filters,
    collection: collection.slug
  });

  return (
    <>
      <section className="section pb-3">
        <div className="shell overflow-hidden rounded-3xl border border-[var(--line)] bg-white card-shadow">
          <div className="grid lg:grid-cols-[1fr_1.2fr]">
            <div className="relative min-h-64">
              <Image src={collection.image} alt={collection.name} fill className="object-cover" />
            </div>
            <div className="p-6 md:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">Designerwelt</p>
              <h1 className="mt-2 text-4xl font-bold">{collection.name}</h1>
              <p className="mt-4 max-w-xl text-[var(--text-soft)]">{collection.description}</p>
              <p className="mt-5 text-sm font-medium text-[var(--text-soft)]">{items.length} Produkte in dieser Kollektion</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section pt-3">
        <div className="shell">
          <SectionHeading title="Alle Designs dieser Kollektion" />
          <FilterBar
            search={filters.search}
            glassType={filters.glassType}
            occasion={filters.occasion}
            collections={collections}
            glassTypes={glassTypes}
            occasions={occasions}
            showCollection={false}
            resetHref={`/collections/${collection.slug}`}
          />
          <p className="mt-4 text-sm text-[var(--text-soft)]">{items.length} Produkte gefunden</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

