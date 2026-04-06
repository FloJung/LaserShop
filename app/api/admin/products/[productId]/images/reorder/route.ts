import { NextResponse } from "next/server";
import { getAdminEditableProduct } from "@/lib/server/admin-products";
import { revalidateShopCatalog } from "@/lib/server/catalog-revalidation";
import { reorderProductImages } from "@/lib/server/admin-product-images";
import { getCurrentSession } from "@/lib/server/admin-session";
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

export async function POST(request: Request, context: { params: Promise<{ productId: string }> }) {
  const authError = await requireAdminRequest();
  if (authError) {
    return authError;
  }

  const { productId } = await context.params;
  const payload = (await request.json().catch(() => null)) as { orderedImageIds?: string[] } | null;
  if (!payload?.orderedImageIds?.length) {
    return NextResponse.json({ error: "orderedImageIds is required." }, { status: 400 });
  }

  try {
    const images = await reorderProductImages(productId, payload.orderedImageIds);
    const product = await getAdminEditableProduct(productId);
    if (product) {
      revalidateShopCatalog({
        currentProduct: product
      });
    }

    return NextResponse.json({
      success: true,
      productId,
      images
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Reordering images failed."
      },
      { status: 400 }
    );
  }
}
