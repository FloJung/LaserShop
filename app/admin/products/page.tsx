import { AdminProductsOverview } from "@/components/admin-products-overview";
import { getAdminProductSummaries } from "@/lib/server/admin-products";
import { requireAdminSession } from "@/lib/server/admin-session";

export default async function AdminProductsPage() {
  await requireAdminSession();
  const products = await getAdminProductSummaries();

  return <AdminProductsOverview products={products} />;
}
