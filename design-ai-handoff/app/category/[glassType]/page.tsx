import { notFound } from "next/navigation";
import { CategoryPromoBanner } from "@/components/category-promo-banner";
import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import { getProductsByGlassType, getProductsByShopCategory, getShopCategory, getFilterOptions } from "@/lib/shop";

export async function generateStaticParams() {
  const filterOptions = await getFilterOptions();
  return [
    ...filterOptions.shopCategories.map((category) => ({ glassType: category.slug })),
    ...filterOptions.glassTypes.map((glassType) => ({ glassType: glassType.name }))
  ];
}

export default async function CategoryPage({
  params
}: {
  params: Promise<{ glassType: string }>;
}) {
  const slug = decodeURIComponent((await params).glassType);
  const [shopCategory, filterOptions] = await Promise.all([getShopCategory(slug), getFilterOptions()]);

  if (shopCategory) {
    const products = await getProductsByShopCategory(shopCategory.slug);

    return (
      <section className="section">
        <div className="shell space-y-5">
          <SectionHeading eyebrow="Kategorie" title={shopCategory.name} description={shopCategory.description} />

          {shopCategory.slug === "glasuntersetzer" && products.length > 0 ? (
            <CategoryPromoBanner
              eyebrow="Kategorie-Highlight"
              title="Gravierte Glasuntersätzer mit Premium-Look"
              description="Entdecke kuratierte Untersetzer für Hausbar, Tisch und Geschenksets. Die Designs greifen die Sprache der Kollektionen auf und geben jedem Arrangement einen sichtbar hochwertigeren Abschluss."
              cta={{ label: "Selbst Gestalten", href: "/untersetzer-editor" }}
              mainImage={products[0].image}
              mainImageAlt="Gravierter Glasuntersätzer"
              accentImage={products[1]?.image ?? products[0].image}
              accentImageAlt="Designbeispiel für Glasuntersätzer"
            />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!filterOptions.glassTypes.some((glassType) => glassType.name === slug)) {
    notFound();
  }

  const products = await getProductsByGlassType(slug);

  return (
    <section className="section">
      <div className="shell">
        <SectionHeading
          eyebrow="Glasart"
          title={slug}
          description="Klar kuratiertes Sortiment mit sofort sichtbaren Preisen und Kaufbuttons."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
