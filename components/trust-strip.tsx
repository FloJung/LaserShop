import { CheckCircle2, ShieldCheck, Truck, Sparkles, Gift } from "lucide-react";

const items = [
  {
    icon: Sparkles,
    title: "Praezise Lasergravur",
    description: "Scharfe Konturen ohne Verblassen."
  },
  {
    icon: CheckCircle2,
    title: "Hochwertige Glaeser",
    description: "Ausgewaehlte Qualitaet fuer Alltag und Anlass."
  },
  {
    icon: Gift,
    title: "Exklusive Designs",
    description: "Kuratiert von Flo, Andrea und Studio."
  },
  {
    icon: ShieldCheck,
    title: "Langlebige Qualitaet",
    description: "Robuste Verarbeitung und klare Gravur."
  },
  {
    icon: Truck,
    title: "Schneller Versand",
    description: "Zuverlaessige Lieferung mit Tracking."
  }
];

export function TrustStrip() {
  return (
    <section className="section">
      <div className="shell rounded-3xl border border-[var(--line)] bg-white p-6 md:p-8 card-shadow">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-2xl bg-[var(--muted-surface)] p-4">
                <Icon size={18} className="text-[var(--brand)]" />
                <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-[var(--text-soft)]">{item.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

