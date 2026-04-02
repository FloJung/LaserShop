import { NextResponse } from "next/server";
import { getAdminEditableProduct } from "@/lib/server/admin-products";
import { getCurrentSession } from "@/lib/server/admin-session";
import { getShopifyProductMappingSummary, syncProductToShopifyDetailed } from "@/lib/server/shopify";
import { isAdminRole } from "@/shared/firebase/roles";

function getShopifySyncPayload(
  productId: string,
  product: NonNullable<Awaited<ReturnType<typeof getAdminEditableProduct>>>
) {
  const preferredVariant =
    product.variants.find((variant) => variant.id === product.defaultVariantId) ??
    product.variants.find((variant) => variant.isActive) ??
    product.variants[0];

  if (!preferredVariant) {
    throw new Error(`Product ${productId} has no variants.`);
  }

  return {
    localProductId: productId,
    localVariantId: preferredVariant.id,
    title: product.title,
    description: product.longDescription || product.shortDescription,
    price: preferredVariant.priceCents / 100,
    sku: preferredVariant.sku,
    status: product.status
  } as const;
}

async function requireAdminRequest() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!isAdminRole(session.role)) {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }

  return null;
}

export async function POST(_: Request, context: { params: Promise<{ productId: string }> }) {
  const authError = await requireAdminRequest();
  if (authError) {
    return authError;
  }

  const { productId } = await context.params;
  const product = await getAdminEditableProduct(productId);
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  try {
    console.log("[admin] shopify product sync requested:", {
      productId,
      defaultVariantId: product.defaultVariantId ?? null
    });

    const shopifySync = await syncProductToShopifyDetailed(getShopifySyncPayload(productId, product));
    const mapping = await getShopifyProductMappingSummary(productId);

    console.log("[admin] shopify product sync completed:", {
      productId,
      success: shopifySync.success,
      action: shopifySync.action,
      responseStatus: "responseStatus" in shopifySync ? shopifySync.responseStatus ?? null : null,
      shopifyProductId: mapping?.shopifyProductId ?? (shopifySync.success ? shopifySync.shopifyProductId : null),
      shopifyVariantId: mapping?.shopifyVariantId ?? (shopifySync.success ? shopifySync.shopifyVariantId ?? null : null),
      mappingWritten: shopifySync.mappingWritten,
      mappingPath: mapping?.mappingPath ?? ("mappingPath" in shopifySync ? shopifySync.mappingPath ?? null : null)
    });

    return NextResponse.json(
      {
        success: shopifySync.success,
        productId,
        action: shopifySync.action,
        responseStatus: "responseStatus" in shopifySync ? shopifySync.responseStatus ?? null : null,
        tokenSource: "tokenSource" in shopifySync ? shopifySync.tokenSource ?? null : null,
        error: shopifySync.success ? null : shopifySync.error,
        shopifyError: shopifySync.success ? null : shopifySync.shopifyError ?? null,
        shopifyProductId: mapping?.shopifyProductId ?? (shopifySync.success ? shopifySync.shopifyProductId : null),
        shopifyVariantId: mapping?.shopifyVariantId ?? (shopifySync.success ? shopifySync.shopifyVariantId ?? null : null),
        mappingWritten: shopifySync.mappingWritten,
        mappingExists: Boolean(mapping),
        mappingPath: mapping?.mappingPath ?? ("mappingPath" in shopifySync ? shopifySync.mappingPath ?? null : null),
        mapping,
        shopifySync
      },
      { status: shopifySync.success ? 200 : 502 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        productId,
        error: error instanceof Error ? error.message : "Shopify sync failed."
      },
      { status: 500 }
    );
  }
}
