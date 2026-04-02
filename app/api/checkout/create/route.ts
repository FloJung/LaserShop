import { NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/server/shopify";

type CreateCheckoutRequest = {
  productId?: string;
  variantId?: string;
  quantity?: number;
};

function normalizeQuantity(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : Number(value);
}

export async function POST(request: Request) {
  let body: CreateCheckoutRequest;
  try {
    body = (await request.json()) as CreateCheckoutRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  const variantId = typeof body.variantId === "string" ? body.variantId.trim() : "";
  const quantity = normalizeQuantity(body.quantity);

  if (!productId || !variantId || !Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "productId, variantId und quantity sind erforderlich." }, { status: 400 });
  }

  try {
    const checkoutUrl = await createCheckoutSession(productId, variantId, quantity);
    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    console.error("[shopify] checkout creation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout creation failed." },
      { status: 500 }
    );
  }
}
