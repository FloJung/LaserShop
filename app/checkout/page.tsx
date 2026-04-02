import { CheckoutForm } from "@/components/checkout-form";
import { SectionHeading } from "@/components/section-heading";

export default function CheckoutPage() {
  return (
    <section className="section">
      <div className="shell space-y-6">
        <SectionHeading
          eyebrow="Legacy Checkout"
          title="Interner Firebase-Checkout ist nicht der aktive Kaufpfad"
          description="Der aktive Storefront-Checkout laeuft ueber Shopify. Diese Seite bleibt nur als interner Altpfad fuer die bestehende Firebase-Orderlogik erhalten."
        />
        <CheckoutForm />
      </div>
    </section>
  );
}
