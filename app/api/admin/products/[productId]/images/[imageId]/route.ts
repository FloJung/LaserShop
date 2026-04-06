import { NextResponse } from "next/server";
import { getAdminEditableProduct } from "@/lib/server/admin-products";
import { revalidateShopCatalog } from "@/lib/server/catalog-revalidation";
import { deleteProductImage, getProductImageRecords, updateProductImage } from "@/lib/server/admin-product-images";
import { getCurrentSession } from "@/lib/server/admin-session";
import { deleteShopifyProductImageForLocalProduct } from "@/lib/server/shopify";
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

export async function PATCH(request: Request, context: { params: Promise<{ productId: string; imageId: string }> }) {
  const authError = await requireAdminRequest();
  if (authError) {
    return authError;
  }

  const { productId, imageId } = await context.params;
  const payload = (await request.json().catch(() => null)) as { altText?: string; isPrimary?: boolean } | null;

  if (!payload || (typeof payload.altText !== "string" && typeof payload.isPrimary !== "boolean")) {
    return NextResponse.json({ error: "No image changes provided." }, { status: 400 });
  }

  try {
    const images = await updateProductImage(productId, imageId, payload);
    const product = await getAdminEditableProduct(productId);
    if (product) {
      revalidateShopCatalog({
        currentProduct: product
      });
    }

    return NextResponse.json({
      success: true,
      productId,
      imageId,
      images
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Updating image failed."
      },
      { status: 400 }
    );
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ productId: string; imageId: string }> }) {
  const authError = await requireAdminRequest();
  if (authError) {
    return authError;
  }

  const { productId, imageId } = await context.params;

  try {
    const currentImages = await getProductImageRecords(productId);
    const imageToDelete = currentImages.find((image) => image.id === imageId);

    if (imageToDelete?.shopifyImageId) {
      await deleteShopifyProductImageForLocalProduct({
        localProductId: productId,
        shopifyImageId: imageToDelete.shopifyImageId
      }).catch(() => undefined);
    }

    const images = await deleteProductImage(productId, imageId);
    const product = await getAdminEditableProduct(productId);
    if (product) {
      revalidateShopCatalog({
        currentProduct: product
      });
    }

    return NextResponse.json({
      success: true,
      productId,
      imageId,
      images
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Deleting image failed."
      },
      { status: 400 }
    );
  }
}
