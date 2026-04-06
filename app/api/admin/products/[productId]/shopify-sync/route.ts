import { NextResponse } from "next/server";
import { getAdminEditableProduct } from "@/lib/server/admin-products";
import { getCurrentSession } from "@/lib/server/admin-session";
import {
  getProductPublicationErrorMessage,
  syncProductStatusToShopify,
  validateProductForPublishing
} from "@/lib/server/product-publication";
import { getShopifyProductMappingSummary } from "@/lib/server/shopify";
import { isAdminRole } from "@/shared/firebase/roles";

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

    if (product.status === "active") {
      const publicationValidation = validateProductForPublishing(product);
      if (!publicationValidation.isPublishable) {
        return NextResponse.json(
          {
            success: false,
            productId,
            error: getProductPublicationErrorMessage(publicationValidation),
            validationIssues: publicationValidation.issues
          },
          { status: 400 }
        );
      }
    }

    const shopifySync = await syncProductStatusToShopify({
      productId,
      product
    });
    const mapping = await getShopifyProductMappingSummary(productId);
    const refreshedProduct = await getAdminEditableProduct(productId);

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
        images: refreshedProduct?.images ?? product.images,
        product: refreshedProduct,
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
