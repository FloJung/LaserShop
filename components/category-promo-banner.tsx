import Image from "next/image";
import { Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/button-link";

export function CategoryPromoBanner({
  eyebrow,
  title,
  description,
  cta,
  mainImage,
  mainImageAlt,
  accentImage,
  accentImageAlt
}: {
  eyebrow: string;
  title: string;
  description: string;
  cta: { label: string; href: string };
  mainImage: string;
  mainImageAlt: string;
  accentImage: string;
  accentImageAlt: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-white p-6 shadow-sm md:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(231,119,44,0.12),_transparent_34%),radial-gradient(circle_at_85%_18%,_rgba(20,184,166,0.12),_transparent_26%)]" />
      <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-[var(--muted-surface)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">
            <Sparkles size={14} />
            {eyebrow}
          </p>
          <h2 className="mt-4 max-w-xl text-3xl font-bold md:text-4xl">{title}</h2>
          <p className="mt-3 max-w-2xl text-[var(--text-soft)]">{description}</p>
          <div className="mt-6">
            <ButtonLink href={cta.href}>{cta.label}</ButtonLink>
          </div>
        </div>

        <div className="relative min-h-[280px]">
          <div className="absolute inset-x-8 bottom-0 top-8 rounded-[2rem] bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(244,247,251,0.86))]" />

          <div className="absolute left-0 top-0 w-[70%] overflow-hidden rounded-[1.6rem] border border-white/80 bg-white shadow-lg">
            <div className="relative aspect-[4/5]">
              <Image src={mainImage} alt={mainImageAlt} fill className="object-cover" />
            </div>
          </div>

          <div className="absolute bottom-4 right-0 w-[48%] overflow-hidden rounded-[1.4rem] border border-white/80 bg-white shadow-lg">
            <div className="relative aspect-square">
              <Image src={accentImage} alt={accentImageAlt} fill className="object-cover" />
            </div>
          </div>

          <div className="absolute right-6 top-8 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-md backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">Kuratiert</p>
            <p className="mt-1 text-sm font-semibold">Fuer Bar, Tisch und Geschenkset</p>
          </div>
        </div>
      </div>
    </article>
  );
}
