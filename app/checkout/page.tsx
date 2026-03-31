import { CheckoutForm } from "@/components/checkout-form";
import { SectionHeading } from "@/components/section-heading";

export default function CheckoutPage() {
  return (
    <section className="section">
      <div className="shell space-y-6">
        <SectionHeading
          eyebrow="Checkout"
          title="Bestellung serverseitig absichern"
          description="Die Preise und Konfigurationen werden ueber Firebase Functions validiert, bevor eine Order geschrieben wird."
        />
        <CheckoutForm />
      </div>
    </section>
  );
}
