import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { DesignerCollection } from "@/lib/types";

export function CollectionCard({ collection }: { collection: DesignerCollection }) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-[var(--line)] bg-white card-shadow">
      <Link href={`/collections/${collection.slug}`} className="grid md:grid-cols-[1.2fr_1fr]">
        <div className="relative h-60 overflow-hidden md:h-full">
          <Image
            src={collection.image}
            alt={collection.name}
            fill
            className="object-cover transition duration-700 group-hover:scale-105"
          />
          <div className={`absolute inset-0 bg-gradient-to-br ${collection.accent} opacity-20`} />
        </div>
        <div className="flex flex-col justify-between p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">{collection.creator}</p>
            <h3 className="mt-2 text-2xl font-bold">{collection.name}</h3>
            <p className="mt-3 text-[var(--text-soft)]">{collection.description}</p>
          </div>
          <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
            Zur Kollektion <ArrowRight size={16} />
          </p>
        </div>
      </Link>
    </article>
  );
}

