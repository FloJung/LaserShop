import { NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/server/shopify";

type CreateCheckoutRequest = {
  lineId?: string;
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
    const checkoutUrl = await createCheckoutSession(productId, variantId, quantity, {
      lineId: typeof body.lineId === "string" ? body.lineId.trim() : undefined,
      lineType: body.lineType === "custom-design" ? ("custom-design" as const) : ("product" as const),
      name: typeof body.name === "string" ? body.name : undefined,
      price: typeof body.price === "number" && Number.isFinite(body.price) ? body.price : undefined,
      image: typeof body.image === "string" ? body.image : undefined,
      previewImage: typeof body.previewImage === "string" ? body.previewImage : undefined,
      subtitle: typeof body.subtitle === "string" ? body.subtitle : undefined,
      configurations: body.configurations,
      designJson: body.designJson
    });
    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    console.error("[shopify] checkout creation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout creation failed." },
      { status: 500 }
    );
  }
}
