import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Rating } from "@/components/rating";
import { formatPrice } from "@/lib/shop";
import type { Product } from "@/lib/types";

const collectionMarkers = {
  flo: {
    label: "F",
    color: "bg-emerald-500"
  },
  andrea: {
    label: "A",
    color: "bg-cyan-500"
  },
  studio: {
    label: "S",
    color: "bg-violet-500"
  }
} as const;

export function ProductCard({ product }: { product: Product }) {
  const marker = collectionMarkers[product.collectionSlug];

  return (
    <article className="group shine overflow-hidden rounded-3xl border border-[var(--line)] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/products/${product.id}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--muted-surface)]">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition duration-700 group-hover:scale-[1.04]"
          />
          {product.badge ? (
            <span className="absolute left-3 top-3 rounded-full bg-[var(--text)] px-2.5 py-1 text-xs font-semibold text-white">
              {product.badge}
            </span>
          ) : null}

          <div
            className={`absolute right-0 top-0 z-10 h-14 w-14 ${marker.color} [clip-path:polygon(100%_0,0_0,100%_100%)] shadow-md`}
            aria-label={`${product.collection} Markierung`}
            title={product.collection}
          />
          <span className="absolute right-2 top-1.5 z-20 text-xs font-bold uppercase text-white">{marker.label}</span>
        </div>
      </Link>

      <div className="space-y-3 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-soft)]">{product.collection}</p>
        <Link href={`/products/${product.id}`} className="block text-lg font-semibold leading-tight transition hover:text-[var(--brand)]">
          {product.name}
        </Link>
        <div className="flex flex-wrap gap-2 text-xs text-[var(--text-soft)]">
          <span className="rounded-full bg-[var(--muted-surface)] px-2 py-1">{product.glassType}</span>
          <span className="rounded-full bg-[var(--muted-surface)] px-2 py-1">{product.occasion}</span>
        </div>
        <Rating value={product.rating} reviews={product.reviews} />
        <div className="flex items-center justify-between">
          <p className="text-xl font-bold">{formatPrice(product.price)}</p>
          <Link
            href={`/products/${product.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
          >
            <ShoppingCart size={14} /> In den Warenkorb
          </Link>
        </div>
      </div>
    </article>
  );
}

