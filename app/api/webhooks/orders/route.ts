import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { handleIncomingOrder } from "@/lib/server/shopify";

export async function POST(request: NextRequest) {
  try {
    // ✅ RAW BODY (extrem wichtig)
    const rawBody = await request.text();

    // ✅ Shopify Header
    const hmacHeader = request.headers.get("x-shopify-hmac-sha256");

    if (!hmacHeader) {
      console.log("❌ Missing HMAC header");
      return NextResponse.json({ error: "Missing HMAC header" }, { status: 401 });
    }

    // ✅ HMAC selbst berechnen (ohne Helper!)
    const generatedHmac = crypto
      .createHmac("sha256", process.env.SHOPIFY_CLIENT_SECRET!)
      .update(rawBody, "utf8")
      .digest("base64");

    // ✅ Debug Logs (entscheidend!)
    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    console.log("RAW BODY:", rawBody);
    console.log("HEADER:", hmacHeader);
    console.log("GENERATED:", generatedHmac);
    console.log("SECRET LENGTH:", process.env.SHOPIFY_CLIENT_SECRET?.length);
    console.log("━━━━━━━━━━━━━━━━━━━━━━");

    // ❌ Vergleich (bewusst einfach!)
    if (generatedHmac !== hmacHeader) {
      console.log("❌ HMAC FAILED");
      return NextResponse.json(
        { error: "Invalid Shopify webhook signature." },
        { status: 401 }
      );
    }

    console.log("✅ HMAC OK");

    // ✅ ERST DANACH JSON parsen
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    // ✅ Order verarbeiten
    const result = await handleIncomingOrder(payload);

    return NextResponse.json(
      { received: true, orderId: result?.orderId ?? null },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Webhook Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}