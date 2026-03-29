const items = [
  {
    q: "Sind alle Designs bereits vorgraviert?",
    a: "Ja. Alle Produkte sind fix fertige Designs ohne Konfigurator oder Editor."
  },
  {
    q: "Wie pflege ich die gravierten Glaeser?",
    a: "Je nach Produkt empfehlen wir Schonprogramm oder Handwaesche. Den Hinweis findest du auf jeder Produktseite."
  },
  {
    q: "Gibt es Geschenkideen nach Anlass?",
    a: "Ja. Im Shop kannst du nach Anlass filtern, z. B. Hochzeit, Geburtstag oder Jubilaeum."
  },
  {
    q: "Wie schnell wird geliefert?",
    a: "In der Regel innerhalb weniger Werktage. Ab 69 EUR erfolgt der Versand kostenlos."
  }
];

export function Faq() {
  return (
    <section className="section">
      <div className="shell rounded-3xl border border-[var(--line)] bg-white p-6 md:p-8 card-shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">FAQ</p>
        <h2 className="mt-2 text-3xl font-bold">Haeufige Fragen</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.q} className="rounded-2xl bg-[var(--muted-surface)] p-4">
              <h3 className="font-semibold">{item.q}</h3>
              <p className="mt-2 text-sm text-[var(--text-soft)]">{item.a}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

