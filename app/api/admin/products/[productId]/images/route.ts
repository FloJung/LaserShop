import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getAdminEditableProduct } from "@/lib/server/admin-products";
import { revalidateShopCatalog } from "@/lib/server/catalog-revalidation";
import { uploadProductImages } from "@/lib/server/admin-product-images";
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
  const productSnapshot = await getAdminDb().collection("products").doc(productId).get();
  if (!productSnapshot.exists) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const title =
    typeof productSnapshot.data()?.title === "string" && productSnapshot.data()?.title.trim().length > 0
      ? productSnapshot.data()!.title.trim()
      : "Produktbild";

  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ error: "No image files provided." }, { status: 400 });
  }

  try {
    const images = await uploadProductImages({
      productId,
      productTitle: title,
      files
    });
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
        error: error instanceof Error ? error.message : "Image upload failed."
      },
      { status: 400 }
    );
  }
}
