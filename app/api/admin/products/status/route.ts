import { NextResponse } from "next/server";
import { bulkUpdateProductStatus } from "@/lib/server/admin-product-status";
import { getCurrentSession } from "@/lib/server/admin-session";
import type { ProductStatus } from "@/shared/catalog";
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

export async function POST(request: Request) {
  const authError = await requireAdminRequest();
  if (authError) {
    return authError;
  }

  const payload = (await request.json().catch(() => null)) as {
    productIds?: string[];
    status?: ProductStatus;
  } | null;

  if (!payload?.status || !["draft", "active", "archived"].includes(payload.status)) {
    return NextResponse.json({ error: "Gueltiger Produktstatus erforderlich." }, { status: 400 });
  }

  if (!Array.isArray(payload.productIds) || payload.productIds.length === 0) {
    return NextResponse.json({ error: "Mindestens ein Produkt muss ausgewaehlt sein." }, { status: 400 });
  }

  const result = await bulkUpdateProductStatus({
    productIds: payload.productIds,
    status: payload.status
  });

  return NextResponse.json(result, {
    status: result.failureCount > 0 ? 207 : 200
  });
}
