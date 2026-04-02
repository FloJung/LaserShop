import { NextResponse } from "next/server";
import { createCartCheckoutSession } from "@/lib/server/shopify";

type CreateCartCheckoutRequest = {
  lines?: Array<{
    productId?: string;
    variantId?: string;
    quantity?: number;
  }>;
};

function normalizeQuantity(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : Number(value);
}

export async function POST(request: Request) {
  let body: CreateCartCheckoutRequest;
  try {
    body = (await request.json()) as CreateCartCheckoutRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const lines = Array.isArray(body.lines)
    ? body.lines
        .map((line) => ({
          productId: typeof line.productId === "string" ? line.productId.trim() : "",
          variantId: typeof line.variantId === "string" ? line.variantId.trim() : "",
          quantity: normalizeQuantity(line.quantity)
        }))
        .filter((line) => line.productId && line.variantId && Number.isInteger(line.quantity) && line.quantity > 0)
    : [];

  if (lines.length === 0) {
    return NextResponse.json({ error: "Mindestens eine gueltige Warenkorb-Position ist erforderlich." }, { status: 400 });
  }

  try {
    const checkoutUrl = await createCartCheckoutSession(lines);
    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    console.error("[shopify] cart checkout creation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cart checkout creation failed." },
      { status: 500 }
    );
  }
}
