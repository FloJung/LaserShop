import { notFound } from "next/navigation";
import { AdminProductEditor } from "@/components/admin-product-editor";
import { getAdminEditableProduct } from "@/lib/server/admin-products";
import { requireAdminSession } from "@/lib/server/admin-session";

export default async function AdminProductDetailPage({
  params
}: {
  params: Promise<{ productId: string }>;
}) {
  await requireAdminSession();
  const { productId } = await params;
  const product = await getAdminEditableProduct(productId);

  if (!product) {
    notFound();
  }

  return <AdminProductEditor product={product} />;
}
