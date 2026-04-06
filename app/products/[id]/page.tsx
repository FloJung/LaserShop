import Link from "next/link";
import { ShieldCheck, Truck, Sparkles, HeartHandshake } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { ProductPurchasePanel } from "@/components/product-purchase-panel";
import { Rating } from "@/components/rating";
import { SectionHeading } from "@/components/section-heading";
import { formatPrice } from "@/lib/money";
import { getProductById, getSimilarProducts } from "@/lib/shop";
import { notFound } from "next/navigation";

const trustItems = [
  { icon: Sparkles, label: "Präzise Lasergravur" },
  { icon: ShieldCheck, label: "Sichere Bezahlung" },
  { icon: Truck, label: "Schneller Versand" },
  { icon: HeartHandshake, label: "Ideal als Geschenk" }
];

export default async function ProductPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const recommendations = await getSimilarProducts(product, 4);
  const galleryImages = [product.image, ...product.gallery.filter((item) => item !== product.image)];

  return (
    <>
      <section className="section">
        <div className="shell grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)]">
          <ProductGallery images={galleryImages} productName={product.name} />

          <div className="space-y-5 rounded-3xl border border-[var(--line)] bg-white p-6 md:p-8 card-shadow">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">{product.collection}</p>
            <h1 className="text-3xl font-bold md:text-4xl">{product.name}</h1>
            <Rating value={product.rating} reviews={product.reviews} />

            <div className="flex flex-wrap gap-2 text-xs text-[var(--text-soft)]">
              <span className="rounded-full bg-[var(--muted-surface)] px-3 py-1.5">{product.glassType}</span>
              <span className="rounded-full bg-[var(--muted-surface)] px-3 py-1.5">Designer: {product.designer}</span>
              <span className="rounded-full bg-[var(--muted-surface)] px-3 py-1.5">Anlass: {product.occasion}</span>
            </div>

            <p className="text-3xl font-bold text-[var(--text)]">{formatPrice(product.price)}</p>

            <p className="text-[var(--text-soft)]">{product.description}</p>

            <ProductPurchasePanel product={product} options={product.options} />

            <div className="rounded-2xl bg-[var(--muted-surface)] p-4 text-sm text-[var(--text-soft)]">
              <p className="font-semibold text-[var(--text)]">Pflegehinweise</p>
              <p className="mt-1">{product.care}</p>
            </div>

            <div>
              <p className="font-semibold">Vorteile</p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--text-soft)]">
                {product.benefits.map((benefit) => (
                  <li key={benefit}>- {benefit}</li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {trustItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white p-3 text-sm">
                    <Icon size={16} className="text-[var(--brand)]" />
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>

            <Link href="/shop" className="inline-block text-sm font-semibold text-[var(--brand)]">
              Zurück zum Shop
            </Link>
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell">
          <SectionHeading title="Ähnliche Produkte" description="Weitere passende Designs für schnelle Anschlusskaeufe." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recommendations.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

