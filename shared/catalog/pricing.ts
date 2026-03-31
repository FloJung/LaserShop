import { SHOP_PRICING_CONFIG } from "./constants";
import type { OrderTotals } from "./models";

export function assertMoney(value: number, fieldName: string) {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be stored as integer cents.`);
  }

  return value;
}

export function toCents(value: number) {
  return Math.round(value * 100);
}

export function fromCents(value: number) {
  return value / 100;
}

export function calculateLineSubtotal(unitPriceCents: number, quantity: number) {
  return assertMoney(unitPriceCents * quantity, "lineSubtotalCents");
}

export function calculateShippingTotal(subtotalCents: number) {
  return subtotalCents >= SHOP_PRICING_CONFIG.freeShippingThresholdCents ? 0 : SHOP_PRICING_CONFIG.defaultShippingCents;
}

export function calculateIncludedTaxCents(grossCents: number) {
  if (!SHOP_PRICING_CONFIG.pricesIncludeTax) {
    return 0;
  }

  const net = Math.round(grossCents / (1 + SHOP_PRICING_CONFIG.taxRate));
  return grossCents - net;
}

export function buildOrderTotals(input: {
  subtotalCents: number;
  discountTotalCents?: number;
  shippingTotalCents?: number;
}): OrderTotals {
  const subtotalCents = assertMoney(input.subtotalCents, "subtotalCents");
  const discountTotalCents = assertMoney(input.discountTotalCents ?? 0, "discountTotalCents");
  const discountedSubtotalCents = Math.max(0, subtotalCents - discountTotalCents);
  const shippingTotalCents = assertMoney(
    input.shippingTotalCents ?? calculateShippingTotal(discountedSubtotalCents),
    "shippingTotalCents"
  );
  const grandTotalCents = discountedSubtotalCents + shippingTotalCents;
  const taxTotalCents = calculateIncludedTaxCents(grandTotalCents);

  return {
    subtotalCents,
    shippingTotalCents,
    taxTotalCents,
    discountTotalCents,
    grandTotalCents
  };
}

export function formatMoney(valueCents: number, locale = "de-DE") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: SHOP_PRICING_CONFIG.currency
  }).format(fromCents(valueCents));
}
