import { NextResponse } from "next/server";
import { createCartCheckoutSession } from "@/lib/server/shopify";

type CreateCartCheckoutRequest = {
  lines?: Array<{
    id?: string;
    lineType?: "product" | "custom-design";
    productId?: string;
    variantId?: string;
    quantity?: number;
    name?: string;
    price?: number;
    image?: string;
    previewImage?: string;
    subtitle?: string;
    configurations?: unknown;
    designJson?: unknown;
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
          lineId: typeof line.id === "string" ? line.id.trim() : undefined,
          lineType: line.lineType === "custom-design" ? ("custom-design" as const) : ("product" as const),
          productId: typeof line.productId === "string" ? line.productId.trim() : "",
          variantId: typeof line.variantId === "string" ? line.variantId.trim() : "",
          quantity: normalizeQuantity(line.quantity),
          name: typeof line.name === "string" ? line.name : undefined,
          price: typeof line.price === "number" && Number.isFinite(line.price) ? line.price : undefined,
          image: typeof line.image === "string" ? line.image : undefined,
          previewImage: typeof line.previewImage === "string" ? line.previewImage : undefined,
          subtitle: typeof line.subtitle === "string" ? line.subtitle : undefined,
          configurations: line.configurations,
          designJson: line.designJson
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
