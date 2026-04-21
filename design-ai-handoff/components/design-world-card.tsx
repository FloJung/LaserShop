import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { DesignerCollection } from "@/lib/types";

export function DesignWorldCard({ collection }: { collection: DesignerCollection }) {
  return (
    <article className="group h-full overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[rgba(255,255,255,0.96)] card-shadow transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_52px_-32px_rgba(15,23,42,0.45)]">
      <Link href={`/collections/${collection.slug}`} className="flex h-full flex-col">
        <div className="relative aspect-[5/4] overflow-hidden border-b border-[var(--line)] bg-[var(--muted-surface)]">
          <Image
            src={collection.image}
            alt={collection.name}
            fill
            className="object-cover transition duration-700 group-hover:scale-[1.04]"
          />
          <div className={`absolute inset-0 bg-gradient-to-br ${collection.accent} opacity-20 transition duration-500 group-hover:opacity-30`} />
        </div>

        <div className="flex flex-1 flex-col justify-between gap-6 p-6 md:p-7">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-[var(--brand)]">{collection.creator}</p>
            <h3 className="mt-3 font-[var(--font-serif)] text-[1.9rem] leading-none text-[var(--text)] md:text-[2.15rem]">
              {collection.name}
            </h3>
            <p className="mt-4 max-w-[34ch] text-sm leading-6 text-[var(--text-soft)]">{collection.description}</p>
          </div>

          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text)] transition group-hover:text-[var(--brand)]">
            Zur Kollektion
            <ArrowRight size={16} className="transition duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
    </article>
  );
}
