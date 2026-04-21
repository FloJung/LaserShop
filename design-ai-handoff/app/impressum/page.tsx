import type { Metadata } from "next";
import { legalCompanyPlaceholders as company, legalTemplateNotice } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Impressum | Laser Shop",
  description: "Impressum mit oesterreichischer Grundstruktur und klar markierten Platzhaltern fuer Firmendaten."
};

function InfoRow({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-1 border-t border-[var(--line)] py-4 first:border-t-0 first:pt-0 md:grid-cols-[220px_1fr]">
      <dt className="text-sm font-semibold text-[var(--text)]">{label}</dt>
      <dd className="text-sm leading-7 text-[var(--text-soft)]">{value}</dd>
    </div>
  );
}

export default function ImpressumPage() {
  return (
    <section className="section">
      <div className="shell space-y-6">
        <div className="admin-hero rounded-[2rem] p-8 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">Rechtliches</p>
          <h1 className="mt-3 max-w-3xl font-[var(--font-serif)] text-4xl leading-tight md:text-5xl">Impressum</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--text-soft)] md:text-lg">
            Diese Seite ist fuer ein Unternehmen in Oesterreich vorbereitet und folgt einer typischen
            oesterreichischen Impressumsstruktur fuer Unternehmenswebsite und Webshop.
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--line)] bg-white p-5 card-shadow">
          <p className="text-sm font-semibold text-[var(--text)]">Wichtiger Hinweis</p>
          <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{legalTemplateNotice}</p>
          <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
            Falls dein Unternehmen bestimmten gewerbe- oder berufsrechtlichen Vorschriften unterliegt, muessen die
            zusaetzlichen Pflichtangaben angepasst werden. Die zugrunde liegenden Vorschriften sind in Oesterreich etwa
            im ECG und Mediengesetz geregelt.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { href: "#unternehmensdaten", label: "Unternehmensdaten" },
            { href: "#registerdaten", label: "Registerdaten" },
            { href: "#gewerbe", label: "Gewerbe & Kammer" },
            { href: "#medieninhaber", label: "Medieninhaber" }
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-[var(--line)] bg-white px-5 py-4 text-sm font-semibold transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <article className="space-y-6">
            <section id="unternehmensdaten" className="rounded-3xl border border-[var(--line)] bg-white p-6 card-shadow">
              <h2 className="text-2xl font-bold">Unternehmensdaten</h2>
              <dl className="mt-5">
                <InfoRow label="Unternehmensname" value={company.companyName} />
                <InfoRow label="Inhaber / Verantwortlicher" value={company.ownerName} />
                <InfoRow label="Unternehmensgegenstand" value={company.businessPurpose} />
                <InfoRow
                  label="Adresse"
                  value={`${company.street}, ${company.postalCode} ${company.city}, ${company.country}`}
                />
                <InfoRow label="Telefon" value={company.phone} />
                <InfoRow label="E-Mail" value={company.email} />
                <InfoRow label="Website" value={company.website} />
              </dl>
            </section>

            <section id="registerdaten" className="rounded-3xl border border-[var(--line)] bg-white p-6 card-shadow">
              <h2 className="text-2xl font-bold">UID- und Registerdaten</h2>
              <dl className="mt-5">
                <InfoRow label="UID-Nummer" value={company.uidNumber} />
                <InfoRow label="Firmenbuchnummer" value={company.companyRegisterNumber} />
                <InfoRow label="Firmenbuchgericht" value={company.companyRegisterCourt} />
              </dl>
            </section>

            <section id="gewerbe" className="rounded-3xl border border-[var(--line)] bg-white p-6 card-shadow">
              <h2 className="text-2xl font-bold">Gewerbe, Aufsicht und Berufsrecht</h2>
              <dl className="mt-5">
                <InfoRow label="Aufsichtsbehoerde" value={company.supervisoryAuthority} />
                <InfoRow label="Kammer / Interessenvertretung" value={company.chamber} />
                <InfoRow label="Berufsbezeichnung" value={company.professionalTitle} />
                <InfoRow label="Verliehen in" value={company.awardingState} />
                <InfoRow label="Anwendbare Vorschriften" value={company.professionalRules} />
              </dl>
              <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
                Gesetzestexte sind ueber das Rechtsinformationssystem des Bundes unter{" "}
                <a
                  href="https://www.ris.bka.gv.at/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[var(--brand)]"
                >
                  ris.bka.gv.at
                </a>{" "}
                abrufbar.
              </p>
            </section>
          </article>

          <aside className="space-y-6">
            <section id="medieninhaber" className="rounded-3xl border border-[var(--line)] bg-white p-6 card-shadow">
              <h2 className="text-2xl font-bold">Medieninhaber und grundlegende Richtung</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
                Medieninhaber und Herausgeber: {company.companyName}
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                Sitz des Medieninhabers: {company.street}, {company.postalCode} {company.city}, {company.country}
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                Grundlegende Richtung der Website: {company.editorialLine}
              </p>
            </section>

            <section className="rounded-3xl border border-[var(--line)] bg-white p-6 card-shadow">
              <h2 className="text-2xl font-bold">Platzhalter schnell austauschen</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
                Die zentralen Platzhalter liegen gesammelt in{" "}
                <code className="rounded bg-[var(--muted-surface)] px-2 py-1">lib/legal.ts</code> und werden sowohl im
                Impressum als auch in den AGB verwendet.
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                Tausche dort zuerst Firmenname, Adresse, Kontakt, UID-Nummer und die Registerdaten aus. Nicht relevante
                Felder koennen nach der Pruefung geloescht oder angepasst werden.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
