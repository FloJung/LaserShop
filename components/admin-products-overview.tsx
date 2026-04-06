import type { AdminProductSummary } from "@/lib/server/admin-products";
import { AdminProductsTable } from "@/components/admin-products-table";

type AdminProductsOverviewProps = {
  products: AdminProductSummary[];
};

export function AdminProductsOverview({ products }: AdminProductsOverviewProps) {
  return <AdminProductsTable products={products} />;
}
