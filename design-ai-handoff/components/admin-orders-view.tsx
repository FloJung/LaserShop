import Link from "next/link";
import type { AdminOrder } from "@/lib/server/admin-orders";
import { formatPrice } from "@/lib/money";

type AdminOrdersViewProps = {
  orders: AdminOrder[];
};

function formatMoneyFromCents(cents: number) {
  return formatPrice(cents / 100);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getStatusClasses(status: string) {
  if (status === "paid" || status === "completed" || status === "ready" || status === "shipped") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "cancelled" || status === "failed" || status === "refunded") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (status === "authorized" || status === "confirmed" || status === "approved" || status === "engraving") {
    return "bg-sky-50 text-sky-700 border-sky-200";
  }

  return "bg-amber-50 text-amber-700 border-amber-200";
}

function SummaryCards({ orders }: { orders: AdminOrder[] }) {
  const revenueCents = orders.reduce((sum, order) => sum + order.grandTotalCents, 0);
  const queuedCount = orders.filter((order) => order.productionStatus === "queued").length;
  const unpaidCount = orders.filter((order) => order.paymentStatus === "pending" || order.paymentStatus === "authorized").length;

  const cards = [
    {
      label: "Bestellungen",
      value: String(orders.length),
      hint: "Zuletzt geladen"
    },
    {
      label: "Umsatz",
      value: formatMoneyFromCents(revenueCents),
      hint: "Summe der geladenen Orders"
    },
    {
      label: "Produktion offen",
      value: String(queuedCount),
      hint: "Status queued"
    },
    {
      label: "Zahlung offen",
      value: String(unpaidCount),
      hint: "pending oder authorized"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.label} className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{card.label}</p>
          <p className="mt-3 text-3xl font-bold text-[var(--text)]">{card.value}</p>
          <p className="mt-2 text-sm text-[var(--text-soft)]">{card.hint}</p>
        </article>
      ))}
    </div>
  );
}

export function AdminOrdersView({ orders }: AdminOrdersViewProps) {
  return (
    <section className="section">
      <div className="shell space-y-6">
        <div className="rounded-3xl border border-[var(--line)] bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">Admin Orders</p>
              <h1 className="mt-3 text-3xl font-bold">Bestellungen</h1>
              <p className="mt-3 max-w-3xl text-[var(--text-soft)]">
                Geschuetzte Firestore-Ansicht fuer echte Bestellungen inklusive Snapshots, Personalisierungen und
                Produktionsstatus.
              </p>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              Zurueck zum Admin
            </Link>
          </div>
        </div>

        <SummaryCards orders={orders} />

        {orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--line)] bg-white p-8 text-[var(--text-soft)] shadow-sm">
            Noch keine Bestellungen in Firestore vorhanden.
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => (
              <article key={order.id} className="rounded-3xl border border-[var(--line)] bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold text-[var(--text)]">{order.orderNumber}</h2>
                      <span className="rounded-full bg-[var(--sand)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text)]">
                        {order.source}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--text-soft)]">
                      {order.customerFirstName} {order.customerLastName} · {order.customerEmail}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-soft)]">
                      Erstellt am {formatDateTime(order.createdAt)} · {order.itemCount} Artikel ·{" "}
                      {formatMoneyFromCents(order.grandTotalCents)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${getStatusClasses(order.paymentStatus)}`}>
                      Payment {order.paymentStatus}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${getStatusClasses(order.orderStatus)}`}>
                      Order {order.orderStatus}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${getStatusClasses(order.productionStatus)}`}>
                      Produktion {order.productionStatus}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
                  <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5">
                    <p className="text-sm font-semibold text-[var(--text)]">Positionen</p>
                    <div className="mt-4 space-y-4">
                      {order.items.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-[var(--line)] bg-white p-4">
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="font-semibold text-[var(--text)]">
                                {item.productTitleSnapshot} · {item.variantNameSnapshot}
                              </p>
                              <p className="mt-1 text-sm text-[var(--text-soft)]">
                                SKU {item.skuSnapshot} · Menge {item.quantity} ·{" "}
                                {formatMoneyFromCents(item.lineTotalCents)}
                              </p>
                            </div>
                            {item.isPersonalized ? (
                              <span className="rounded-full bg-[var(--sand)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text)]">
                                personalisiert
                              </span>
                            ) : null}
                          </div>

                          {item.configurations.length > 0 ? (
                            <div className="mt-4 space-y-2">
                              {item.configurations.map((configuration) => (
                                <div
                                  key={configuration.id}
                                  className="flex flex-col gap-1 rounded-2xl bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-soft)]"
                                >
                                  <p className="font-medium text-[var(--text)]">{configuration.optionNameSnapshot}</p>
                                  <p>{configuration.renderedValue}</p>
                                  <p>
                                    Typ {configuration.optionTypeSnapshot} · Aufpreis{" "}
                                    {formatMoneyFromCents(configuration.priceModifierSnapshotCents)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5">
                      <p className="text-sm font-semibold text-[var(--text)]">Versand</p>
                      <div className="mt-4 text-sm text-[var(--text-soft)]">
                        <p>
                          {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                        </p>
                        {order.shippingAddress.company ? <p>{order.shippingAddress.company}</p> : null}
                        <p>{order.shippingAddress.line1}</p>
                        {order.shippingAddress.line2 ? <p>{order.shippingAddress.line2}</p> : null}
                        <p>
                          {order.shippingAddress.postalCode} {order.shippingAddress.city}
                        </p>
                        <p>{order.shippingAddress.countryCode}</p>
                        {order.shippingAddress.phone ? <p className="mt-2">Tel. {order.shippingAddress.phone}</p> : null}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5">
                      <p className="text-sm font-semibold text-[var(--text)]">Totals</p>
                      <div className="mt-4 space-y-2 text-sm text-[var(--text-soft)]">
                        <div className="flex items-center justify-between">
                          <span>Zwischensumme</span>
                          <span>{formatMoneyFromCents(order.subtotalCents)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Versand</span>
                          <span>{formatMoneyFromCents(order.shippingTotalCents)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Steuer</span>
                          <span>{formatMoneyFromCents(order.taxTotalCents)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Rabatt</span>
                          <span>-{formatMoneyFromCents(order.discountTotalCents)}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-[var(--line)] pt-2 font-semibold text-[var(--text)]">
                          <span>Gesamt</span>
                          <span>{formatMoneyFromCents(order.grandTotalCents)}</span>
                        </div>
                      </div>
                    </div>

                    {order.notesCustomer || order.notesInternal ? (
                      <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5">
                        <p className="text-sm font-semibold text-[var(--text)]">Notizen</p>
                        {order.notesCustomer ? (
                          <div className="mt-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                              Kunde
                            </p>
                            <p className="mt-1 text-sm text-[var(--text)]">{order.notesCustomer}</p>
                          </div>
                        ) : null}
                        {order.notesInternal ? (
                          <div className="mt-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                              Intern
                            </p>
                            <p className="mt-1 text-sm text-[var(--text)]">{order.notesInternal}</p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
