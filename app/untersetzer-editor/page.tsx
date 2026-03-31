import { CoasterEditor } from "@/components/editor/coaster-editor";
import { SectionHeading } from "@/components/section-heading";

export default function CoasterEditorPage() {
  return (
    <section className="section">
      <div className="shell space-y-6">
        <SectionHeading
          eyebrow="Selbst gestalten"
          title="Design-Tool für Glasuntersätzer"
          description="Gestalte eine feste 10 x 10 cm Fläche mit Text, Icons und einfachen Design-Elementen. Das Ergebnis wird als JSON gespeichert und direkt dem Produkt Glasuntersätzer Custom zugeordnet."
        />
        <CoasterEditor />
      </div>
    </section>
  );
}
