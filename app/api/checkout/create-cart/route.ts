import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RateLimitExceededError, assertInMemoryRateLimit } from "@/lib/server/rate-limit";
import { logRequestSecurityEvents } from "@/lib/server/security-monitoring";
import { createCartCheckoutSession } from "@/lib/server/shopify";
import { CheckoutSecurityError } from "@/shared/catalog";
import { getCheckoutSecurityEvents, getDefaultSecuritySeverity } from "@/shared/security-monitoring";

type CreateCartCheckoutRequest = {
  lines?: Array<{
    id?: string;
    lineType?: "product" | "custom-design";
    productId?: string;
    variantId?: string;
    quantity?: number;
    previewImage?: string;
    configurations?: unknown;
  }>;
};

function normalizeQuantity(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : Number(value);
}

export async function POST(request: Request) {
  try {
    assertInMemoryRateLimit(request, {
      namespace: "checkout:create-cart",
      limit: 5,
      windowMs: 60_000
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      await logRequestSecurityEvents(request, [
        {
          type: "rate_limit_hit",
          severity: getDefaultSecuritySeverity("rate_limit_hit"),
          reason: error.message
        }
      ]).catch((loggingError) => {
        console.error("[security] failed to log rate limit hit", loggingError);
      });
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    throw error;
  }

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
          previewImage: typeof line.previewImage === "string" ? line.previewImage : undefined,
          configurations: line.configurations
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
    if (error instanceof CheckoutSecurityError) {
      await logRequestSecurityEvents(request, getCheckoutSecurityEvents(error.message)).catch((loggingError) => {
        console.error("[security] failed to log checkout security error", loggingError);
      });
    }
    const status = error instanceof CheckoutSecurityError || error instanceof ZodError ? 400 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cart checkout creation failed." },
      { status }
    );
  }
}
