"use client";

import { httpsCallable } from "firebase/functions";
import { getFirebaseClientFunctions } from "@/lib/firebase/client";
import type { CheckoutValidationRequest } from "@/shared/catalog";

type ValidateCartResponse = {
  currency: "EUR";
  totals: {
    subtotalCents: number;
    shippingTotalCents: number;
    taxTotalCents: number;
    discountTotalCents: number;
    grandTotalCents: number;
  };
  maxProductionTimeDays: number;
};

type CreateOrderResponse = {
  orderId: string;
  orderNumber: string;
  totals: ValidateCartResponse["totals"];
  paymentStatus: string;
  orderStatus: string;
  productionStatus: string;
};

export async function validateCartWithBackend(payload: CheckoutValidationRequest) {
  const callable = httpsCallable<CheckoutValidationRequest, ValidateCartResponse>(getFirebaseClientFunctions(), "validateCart");
  const result = await callable(payload);
  return result.data;
}

export async function createOrderWithBackend(payload: CheckoutValidationRequest) {
  const callable = httpsCallable<CheckoutValidationRequest, CreateOrderResponse>(getFirebaseClientFunctions(), "createOrderFromCart");
  const result = await callable(payload);
  return result.data;
}
