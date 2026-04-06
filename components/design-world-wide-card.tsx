import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { DesignerCollection } from "@/lib/types";

export function DesignWorldWideCard({ collection }: { collection: DesignerCollection }) {
  return (
    <article className="group overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[rgba(255,255,255,0.96)] card-shadow transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_52px_-32px_rgba(15,23,42,0.45)]">
      <Link href={`/collections/${collection.slug}`} className="grid h-full lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="relative aspect-[16/10] overflow-hidden border-b border-[var(--line)] bg-[var(--muted-surface)] lg:aspect-auto lg:min-h-[20rem] lg:border-b-0 lg:border-r">
          <Image
            src={collection.image}
            alt={collection.name}
            fill
            className="object-cover transition duration-700 group-hover:scale-[1.04]"
          />
          <div className={`absolute inset-0 bg-gradient-to-br ${collection.accent} opacity-20 transition duration-500 group-hover:opacity-30`} />
        </div>

        <div className="flex flex-col justify-center p-6 md:p-8 lg:p-10">
          <div className="mb-6 h-1.5 w-24 rounded-full bg-[linear-gradient(90deg,var(--brand),rgba(231,119,44,0.15))]" />
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[var(--brand)]">{collection.creator}</p>
          <h3 className="mt-3 font-[var(--font-serif)] text-[2rem] leading-none text-[var(--text)] md:text-[2.35rem]">
            {collection.name}
          </h3>
          <p className="mt-4 max-w-[38ch] text-sm leading-7 text-[var(--text-soft)] md:text-[0.97rem]">
            {collection.description}
          </p>

          <span className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text)] transition group-hover:text-[var(--brand)]">
            Zur Kollektion
            <ArrowRight size={16} className="transition duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
    </article>
  );
}
