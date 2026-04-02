import { NextRequest, NextResponse } from "next/server";
import { handleIncomingOrder, verifyShopifyWebhookHmac } from "@/lib/server/shopify";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const hmacHeader = request.headers.get("x-shopify-hmac-sha256");

    if (!hmacHeader) {
      return NextResponse.json({ error: "Missing HMAC header" }, { status: 401 });
    }

    if (!verifyShopifyWebhookHmac(rawBody, hmacHeader)) {
      return NextResponse.json(
        { error: "Invalid Shopify webhook signature." },
        { status: 401 }
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const result = await handleIncomingOrder(payload);

    return NextResponse.json(
      { received: true, orderId: result?.orderId ?? null },
      { status: 200 }
    );

  } catch (error) {
    console.error("[shopify] webhook error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
