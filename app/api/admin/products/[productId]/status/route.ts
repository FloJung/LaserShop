import { NextResponse } from "next/server";
import { updateProductStatus } from "@/lib/server/admin-product-status";
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

export async function PATCH(request: Request, context: { params: Promise<{ productId: string }> }) {
  const authError = await requireAdminRequest();
  if (authError) {
    return authError;
  }

  const { productId } = await context.params;
  const payload = (await request.json().catch(() => null)) as { status?: ProductStatus } | null;

  if (!payload?.status || !["draft", "active", "archived"].includes(payload.status)) {
    return NextResponse.json({ error: "Gueltiger Produktstatus erforderlich." }, { status: 400 });
  }

  const result = await updateProductStatus({
    productId,
    status: payload.status
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: result.validationIssues ? 400 : 404 });
  }

  return NextResponse.json(result);
}
