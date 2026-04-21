import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { DesignWorldGrid } from "@/components/design-world-grid";
import { Faq } from "@/components/faq";
import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import { Testimonials } from "@/components/testimonials";
import { TrustStrip } from "@/components/trust-strip";
import { getFeaturedProducts, getFilterOptions } from "@/lib/shop";

export default async function HomePage() {
  const [featuredProducts, filterOptions] = await Promise.all([getFeaturedProducts(8), getFilterOptions()]);
  const heroCollection = filterOptions.collections[0];
  const giftIdeas = filterOptions.occasions.slice(0, 5).map((occasion) => ({
    label: occasion.name,
    href: `/shop?occasion=${encodeURIComponent(occasion.name)}`
  }));

  return (
    <>
      <section className="section pt-8">
        <div className="shell grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--brand)]">
              <Sparkles size={16} /> Hochwertige Lasergravuren
            </p>
            <h1 className="mt-5 max-w-xl font-[var(--font-serif)] text-4xl leading-tight md:text-6xl">
              Gravierte Glaeser mit Boutique-Look und klarer Shop-Logik
            </h1>
            <p className="mt-4 max-w-xl text-lg text-[var(--text-soft)]">
              Entdecke fertige Designglaeser fuer Geschenke und besondere Momente. Schnell finden, sofort kaufen.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
              >
                Jetzt shoppen
              </Link>
              <Link
                href={heroCollection ? `/collections/${heroCollection.slug}` : "/shop"}
                className="rounded-full border border-[var(--line)] bg-white px-6 py-3 text-sm font-semibold transition hover:border-[var(--brand)]"
              >
                {heroCollection ? `${heroCollection.name} ansehen` : "Kollektion ansehen"}
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-[var(--line)] bg-white p-3 card-shadow">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem]">
              <Image
                src="/images/glas/2er-set-weinglas-ringe-personalisiert-699d1e.jpg"
                alt="Hero Bild mit gravierten Glaesern"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <SectionHeading
            eyebrow="Designwelten"
            title="Kuratierte Designer-Kollektionen"
            description="Eigenstaendige Collection-Bereiche innerhalb derselben Marke fuer schnelle Orientierung und klares Styling."
          />
          <DesignWorldGrid collections={filterOptions.collections} />
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell">
          <SectionHeading
            eyebrow="Kategorien"
            title="Nach Angebotsbereich shoppen"
            description="Klare Einstiege fuer das gesamte Sortiment: Kategorien, Untersetzer und gebuendelte Deals."
          />
          <div className="grid gap-3 md:grid-cols-3">
            {filterOptions.shopCategories.map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="group rounded-2xl border border-[var(--line)] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[var(--brand)]"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Kategorie</p>
                <p className="mt-1 text-xl font-semibold">{category.name}</p>
                <p className="mt-2 text-sm text-[var(--text-soft)]">{category.description}</p>
                <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)]">
                  Produkte ansehen <ArrowRight size={15} className="transition group-hover:translate-x-1" />
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell">
          <SectionHeading
            eyebrow="Bestseller"
            title="Beliebte Produkte"
            description="Preis, Designwelt und Kaufbutton direkt sichtbar fuer hohe Scanbarkeit und schnelle Entscheidungen."
            action={
              <Link href="/shop" className="text-sm font-semibold text-[var(--brand)]">
                Alle Produkte ansehen
              </Link>
            }
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell rounded-3xl border border-[var(--line)] bg-white p-6 md:p-8 card-shadow">
          <SectionHeading
            eyebrow="Geschenkideen"
            title="Finde Designs nach Anlass"
            description="Anlass waehlen, relevante Produkte sehen, sofort kaufen."
          />
          <div className="flex flex-wrap gap-3">
            {giftIdeas.map((idea) => (
              <Link
                key={idea.label}
                href={idea.href}
                className="rounded-full border border-[var(--line)] bg-[var(--muted-surface)] px-4 py-2 text-sm font-semibold transition hover:border-[var(--brand)] hover:bg-white"
              >
                {idea.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <TrustStrip />
      <Testimonials />
      <Faq />
    </>
  );
}
