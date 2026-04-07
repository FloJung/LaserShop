import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RateLimitExceededError } from "@/lib/server/rate-limit";
import { createGlobalRateLimiter } from "@/lib/server/rate-limit-global";
import { AccessDeniedError, assertRequestIpNotBlocked, logRequestSecurityEvents } from "@/lib/server/security-monitoring";
import { createCheckoutSession } from "@/lib/server/shopify";
import { CheckoutSecurityError } from "@/shared/catalog";
import { getCheckoutSecurityEvents, getDefaultSecuritySeverity } from "@/shared/security-monitoring";

type CreateCheckoutRequest = {
  lineId?: string;
  lineType?: "product" | "custom-design";
  productId?: string;
  variantId?: string;
  quantity?: number;
  previewImage?: string;
  configurations?: unknown;
};

function normalizeQuantity(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : Number(value);
}

const checkoutRateLimiter = createGlobalRateLimiter({
  limit: 5,
  window: "60 s",
  fallbackWindowMs: 60_000
});

export async function POST(request: Request) {
  try {
    await assertRequestIpNotBlocked(request);
    await checkoutRateLimiter.limit(request, {
      endpoint: "checkout:create"
    });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

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
    const checkoutUrl = await createCheckoutSession({
      lineId: typeof body.lineId === "string" ? body.lineId.trim() : `buy-now-${productId}`,
      lineType: body.lineType === "custom-design" ? ("custom-design" as const) : ("product" as const),
      productId,
      variantId,
      quantity,
      previewImage: typeof body.previewImage === "string" ? body.previewImage : undefined,
      configurations: body.configurations
    });
    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    console.error("[shopify] checkout creation failed:", error);
    if (error instanceof CheckoutSecurityError) {
      await logRequestSecurityEvents(request, getCheckoutSecurityEvents(error.message)).catch((loggingError) => {
        console.error("[security] failed to log checkout security error", loggingError);
      });
    }
    const status = error instanceof CheckoutSecurityError || error instanceof ZodError ? 400 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout creation failed." },
      { status }
    );
  }
}
