const testimonials = [
  {
    name: "Mira W.",
    quote: "Die Gravur ist extrem sauber und das Glas wirkt noch hochwertiger als auf den Bildern.",
    tag: "Hochzeitsgeschenk"
  },
  {
    name: "Jan K.",
    quote: "Sehr schnelle Lieferung. Die Studio-Kollektion hat bei unserem Jubilaeum alle beeindruckt.",
    tag: "Jubilaeum"
  },
  {
    name: "Sophie R.",
    quote: "Die Shop-Struktur ist super klar, ich habe in wenigen Minuten das passende Set gefunden.",
    tag: "Geburtstag"
  }
];

export function Testimonials() {
  return (
    <section className="section">
      <div className="shell">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">Kundenstimmen</p>
          <h2 className="mt-2 text-3xl font-bold">Was Kunden ueber unsere Glaeser sagen</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.name} className="rounded-3xl border border-[var(--line)] bg-white p-6 card-shadow">
              <p className="text-[var(--text)]">"{item.quote}"</p>
              <p className="mt-6 text-sm font-semibold">{item.name}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-soft)]">{item.tag}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

