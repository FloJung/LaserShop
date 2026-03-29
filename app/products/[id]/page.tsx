import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Truck, Sparkles, HeartHandshake } from "lucide-react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductCard } from "@/components/product-card";
import { Rating } from "@/components/rating";
import { SectionHeading } from "@/components/section-heading";
import { formatPrice, getProductById, getSimilarProducts } from "@/lib/shop";
import { notFound } from "next/navigation";

const trustItems = [
  { icon: Sparkles, label: "Praezise Lasergravur" },
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
  const product = getProductById(id);

  if (!product) {
    notFound();
  }

  const recommendations = getSimilarProducts(product, 4);

  return (
    <>
      <section className="section">
        <div className="shell grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <div className="rounded-3xl border border-[var(--line)] bg-white p-4 card-shadow">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--muted-surface)]">
              <Image src={product.image} alt={product.name} fill className="object-cover" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {product.gallery.map((item, index) => (
                <div key={`${item}-${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--muted-surface)]">
                  <Image src={item} alt={`${product.name} Galerie ${index + 1}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          </div>

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

            <AddToCartButton product={product} className="w-full rounded-2xl" />

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
              Zurueck zum Shop
            </Link>
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell">
          <SectionHeading title="Aehnliche Produkte" description="Weitere passende Designs fuer schnelle Anschlusskaeufe." />
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

