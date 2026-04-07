import { AdminSecurityView } from "@/components/admin-security-view";
import { requireAdminSession } from "@/lib/server/admin-session";
import { getAdminSecurityDashboardData } from "@/lib/server/security-monitoring";

export default async function AdminSecurityPage() {
  await requireAdminSession();
  const data = await getAdminSecurityDashboardData();

  return <AdminSecurityView {...data} />;
}
