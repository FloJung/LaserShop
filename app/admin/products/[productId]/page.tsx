import { notFound } from "next/navigation";
import { AdminProductEditor } from "@/components/admin-product-editor";
import { getAdminEditableProduct } from "@/lib/server/admin-products";
import { requireAdminSession } from "@/lib/server/admin-session";
import { getProductTaxonomyCatalog } from "@/lib/server/product-taxonomies";

export default async function AdminProductDetailPage({
  params
}: {
  params: Promise<{ productId: string }>;
}) {
  await requireAdminSession();
  const { productId } = await params;
  const [product, taxonomies] = await Promise.all([
    getAdminEditableProduct(productId),
    getProductTaxonomyCatalog()
  ]);

  if (!product) {
    notFound();
  }

  return <AdminProductEditor product={product} taxonomies={taxonomies} />;
}
