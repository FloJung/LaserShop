import { CartPage } from "@/components/cart-page";
import { SectionHeading } from "@/components/section-heading";

export default function CartRoute() {
  return (
    <section className="section">
      <div className="shell space-y-6">
        <SectionHeading
          eyebrow="Warenkorb"
          title="Deine Auswahl"
          description="Hier siehst du Standardprodukte und individuell gestaltete Glasuntersätzer inklusive Vorschau."
        />
        <CartPage />
      </div>
    </section>
  );
}
