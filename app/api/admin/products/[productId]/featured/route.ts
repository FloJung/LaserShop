import { NextResponse } from "next/server";
import { updateProductFeaturedStatus } from "@/lib/server/admin-product-featured";
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

export async function PATCH(request: Request, context: { params: Promise<{ productId: string }> }) {
  const authError = await requireAdminRequest();
  if (authError) {
    return authError;
  }

  const { productId } = await context.params;
  const payload = (await request.json().catch(() => null)) as { featured?: boolean } | null;

  if (typeof payload?.featured !== "boolean") {
    return NextResponse.json({ error: "Boolean-Wert fuer featured erforderlich." }, { status: 400 });
  }

  const result = await updateProductFeaturedStatus({
    productId,
    featured: payload.featured
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: result.error === "Produkt nicht gefunden." ? 404 : 400 });
  }

  return NextResponse.json(result);
}
