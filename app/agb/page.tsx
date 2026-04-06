import type { Metadata } from "next";
import { legalCompanyPlaceholders as company, legalTemplateNotice } from "@/lib/legal";

export const metadata: Metadata = {
  title: "AGB | Laser Shop",
  description: "AGB mit oesterreichischer Grundstruktur fuer einen Online-Shop und klar markierten Platzhaltern."
};

const sections = [
  {
    id: "geltungsbereich",
    title: "1. Geltungsbereich",
    paragraphs: [
      "Diese Allgemeinen Geschaeftsbedingungen gelten fuer Bestellungen ueber diesen Online-Shop sowie fuer daraus entstehende Vertragsverhaeltnisse zwischen " +
        company.companyName +
        " und den jeweiligen Kunden.",
      "Soweit der Kunde Verbraucher im Sinn des Konsumentenschutzgesetzes (KSchG) ist, bleiben zwingende Verbraucherrechte nach oesterreichischem Recht, insbesondere nach dem FAGG und KSchG, unberuehrt."
    ]
  },
  {
    id: "vertragsabschluss",
    title: "2. Vertragsabschluss",
    paragraphs: [
      "Die Darstellung der Produkte im Online-Shop stellt noch kein verbindliches Angebot dar, sondern eine Aufforderung an den Kunden, ein Angebot abzugeben.",
      "Mit Abschluss des Bestellvorgangs gibt der Kunde eine verbindliche Bestellung ab. Der Vertrag kommt erst zustande, wenn wir die Bestellung durch ausdrueckliche Auftragsbestaetigung, Versandbestaetigung oder durch Auslieferung der Ware annehmen.",
      "Die Vertrags- und Geschaeftssprache ist Deutsch. Bei individualisierten oder personalisierten Produkten koennen zusaetzliche Freigaben, Korrekturen oder Abstimmungen erforderlich sein."
    ]
  },
  {
    id: "preise",
    title: "3. Preise",
    paragraphs: [
      "Alle Preise verstehen sich in Euro. Sofern nicht anders ausgewiesen, enthalten die Preise die in Oesterreich gesetzlich vorgesehene Umsatzsteuer.",
      "Zusatzkosten, insbesondere Versandkosten, werden dem Kunden vor Absenden der Bestellung gesondert angezeigt."
    ]
  },
  {
    id: "zahlung",
    title: "4. Zahlung",
    paragraphs: [
      "Die im Bestellprozess angebotenen Zahlungsarten werden waehrend des Checkouts angezeigt.",
      "Sofern nicht anders vereinbart, ist der Rechnungsbetrag mit Vertragsabschluss sofort faellig."
    ]
  },
  {
    id: "leistungserbringung",
    title: "5. Lieferung und Leistungserbringung",
    paragraphs: [
      "Liefertermine und Lieferfristen richten sich nach den Angaben im Online-Shop oder in der Bestellbestaetigung.",
      "Teillieferungen sind zulaessig, soweit sie fuer den Kunden zumutbar sind.",
      "Bei Verbrauchergeschaeften geht die Gefahr des Verlusts oder der Beschaedigung der Ware grundsaetzlich erst mit Uebergabe an den Verbraucher oder an einen von ihm benannten, nicht als Befoerderer taetigen Dritten ueber."
    ]
  },
  {
    id: "eigentumsvorbehalt",
    title: "6. Eigentumsvorbehalt",
    paragraphs: ["Die gelieferte Ware bleibt bis zur vollstaendigen Bezahlung unser Eigentum."]
  },
  {
    id: "ruecktritt",
    title: "7. Ruecktrittsrecht fuer Verbraucher",
    paragraphs: [
      "Verbrauchern steht bei Fernabsatzvertraegen grundsaetzlich ein 14-taegiges Ruecktrittsrecht gemaess FAGG zu. Die Frist beginnt bei Warenlieferungen grundsaetzlich mit dem Tag, an dem der Verbraucher oder ein von ihm benannter Dritter die Ware in Besitz nimmt.",
      "Zur Ausuebung des Ruecktritts ist eine eindeutige Erklaerung an " +
        company.companyName +
        ", " +
        company.email +
        ", " +
        company.phone +
        " zu richten. Zur Wahrung der Frist reicht die rechtzeitige Absendung der Ruecktrittserklaerung.",
      "Kein Ruecktrittsrecht besteht insbesondere fuer Waren, die nach Kundenspezifikation angefertigt werden oder eindeutig auf die persoenlichen Beduerfnisse zugeschnitten sind. Dies kann bei individualisierten oder personalisierten Gravurprodukten der Fall sein.",
      "Die unmittelbaren Kosten der Ruecksendung traegt: " +
        company.returnShippingCosts +
        ". Im Fall eines wirksamen Ruecktritts sind bereits empfangene Leistungen nach den gesetzlichen Vorgaben rueckzuerstatten."
    ]
  },
  {
    id: "gewaehrleistung",
    title: "8. Gewaehrleistung",
    paragraphs: [
      "Es gelten die gesetzlichen Gewaehrleistungsbestimmungen des oesterreichischen Rechts.",
      "Gegenueber Unternehmern gilt die Pflicht zur unverzueglichen Untersuchung und Maengelruege im gesetzlich zulaessigen Umfang."
    ]
  },
  {
    id: "haftung",
    title: "9. Haftung",
    paragraphs: [
      "Wir haften unbeschraenkt fuer Schaeden aus der Verletzung von Leben, Koerper oder Gesundheit sowie fuer Schaeden, die auf Vorsatz oder grober Fahrlaessigkeit beruhen.",
      "Gegenueber Unternehmern ist die Haftung fuer leichte Fahrlaessigkeit, soweit gesetzlich zulaessig, auf typische und vorhersehbare Schaeden begrenzt.",
      "Gegenueber Verbrauchern gelten die gesetzlichen Haftungsbestimmungen."
    ]
  },
  {
    id: "recht",
    title: "10. Anwendbares Recht",
    paragraphs: [
      "Es gilt oesterreichisches Recht unter Ausschluss der Verweisungsnormen des internationalen Privatrechts und unter Ausschluss des UN-Kaufrechts.",
      "Gegenueber Verbrauchern gilt diese Rechtswahl nur insoweit, als dadurch keine zwingenden gesetzlichen Bestimmungen des Staates eingeschraenkt werden, in dem der Verbraucher seinen gewoehnlichen Aufenthalt hat."
    ]
  },
  {
    id: "gerichtsstand",
    title: "11. Gerichtsstand",
    paragraphs: [
      "Fuer Streitigkeiten mit Unternehmern wird, soweit gesetzlich zulaessig, das sachlich zustaendige Gericht am Sitz von " +
        company.companyName +
        " in " +
        company.placeOfJurisdiction +
        " vereinbart.",
      "Fuer Verbraucher gelten die zwingenden gesetzlichen Gerichtsstandsregeln."
    ]
  }
] as const;

export default function AgbPage() {
  return (
    <section className="section">
      <div className="shell space-y-6">
        <div className="admin-hero rounded-[2rem] p-8 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">Rechtliches</p>
          <h1 className="mt-3 max-w-3xl font-[var(--font-serif)] text-4xl leading-tight md:text-5xl">
            Allgemeine Geschaeftsbedingungen
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--text-soft)] md:text-lg">
            Diese AGB sind als oesterreichische Grundstruktur fuer einen Online-Shop vorbereitet und verwenden bewusst
            keine Formulierungen, die auf deutsches Recht zugeschnitten sind.
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--line)] bg-white p-5 card-shadow">
          <p className="text-sm font-semibold text-[var(--text)]">Wichtiger Hinweis</p>
          <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{legalTemplateNotice}</p>
          <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
            Diese AGB-Vorlage ersetzt keine individuelle rechtliche Pruefung. Fuer Webshops in Oesterreich muessen
            zusaetzlich die Informationspflichten im Checkout, in der Bestellbestaetigung und gegebenenfalls ein
            Muster-Ruecktrittsformular sauber eingebunden werden.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-2xl border border-[var(--line)] bg-white px-5 py-4 text-sm font-semibold transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              {section.title}
            </a>
          ))}
        </div>

        <article className="rounded-3xl border border-[var(--line)] bg-white p-6 md:p-8 card-shadow">
          <div className="space-y-8">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-28 border-t border-[var(--line)] pt-8 first:border-t-0 first:pt-0">
                <h2 className="text-2xl font-bold">{section.title}</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-soft)] md:text-base">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
