import { FilterBar } from "@/components/filter-bar";
import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import { filterOptions, filterProducts } from "@/lib/shop";

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default async function ShopPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = {
    search: readParam(params.search),
    glassType: readParam(params.glassType),
    collection: readParam(params.collection),
    occasion: readParam(params.occasion)
  };

  const visibleProducts = filterProducts(filters);

  return (
    <section className="section">
      <div className="shell space-y-6">
        <SectionHeading
          eyebrow="Shop"
          title="Alle gravierten Produkte und Angebote"
          description="Filtere nach Produktart, Kollektion und Anlass fuer eine schnelle Produktauswahl mit klarer Kaufentscheidung."
        />

        <FilterBar
          search={filters.search}
          glassType={filters.glassType}
          collection={filters.collection}
          occasion={filters.occasion}
          collections={filterOptions.collections}
          glassTypes={filterOptions.glassTypes}
          occasions={filterOptions.occasions}
        />

        <p className="text-sm text-[var(--text-soft)]">{visibleProducts.length} Produkte gefunden</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

