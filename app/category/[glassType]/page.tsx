import { notFound } from "next/navigation";
import { CategoryPromoBanner } from "@/components/category-promo-banner";
import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import { glassTypes, shopCategories } from "@/lib/data/products";
import { getProductsByGlassType, getProductsByShopCategory, getShopCategory } from "@/lib/shop";
import type { ShopCategorySlug } from "@/lib/types";

export function generateStaticParams() {
  return [
    ...shopCategories.map((category) => ({ glassType: category.slug })),
    ...glassTypes.map((glassType) => ({ glassType }))
  ];
}

export default async function CategoryPage({
  params
}: {
  params: Promise<{ glassType: string }>;
}) {
  const slug = decodeURIComponent((await params).glassType);
  const shopCategory = getShopCategory(slug as ShopCategorySlug);

  if (shopCategory) {
    const products = getProductsByShopCategory(shopCategory.slug);

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

  if (!glassTypes.includes(slug as (typeof glassTypes)[number])) {
    notFound();
  }

  const products = getProductsByGlassType(slug);

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
