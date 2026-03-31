import { AdminOrdersView } from "@/components/admin-orders-view";
import { getRecentAdminOrders } from "@/lib/server/admin-orders";
import { requireAdminSession } from "@/lib/server/admin-session";

export default async function AdminOrdersPage() {
  await requireAdminSession();
  const orders = await getRecentAdminOrders();

  return <AdminOrdersView orders={orders} />;
}
