import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/server/admin-session";
import {
  createProductTaxonomyValue,
  getProductTaxonomyCatalog
} from "@/lib/server/product-taxonomies";
import { isAdminRole } from "@/shared/firebase/roles";
import { productTaxonomyKindSchema } from "@/shared/catalog";

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

export async function GET() {
  const authError = await requireAdminRequest();
  if (authError) {
    return authError;
  }

  const catalog = await getProductTaxonomyCatalog();
  return NextResponse.json({ catalog });
}

export async function POST(request: Request) {
  const authError = await requireAdminRequest();
  if (authError) {
    return authError;
  }

  try {
    const body = (await request.json()) as {
      kind?: unknown;
      name?: unknown;
      description?: unknown;
    };
    const kind = productTaxonomyKindSchema.parse(body.kind);
    const name = typeof body.name === "string" ? body.name : "";
    const description = typeof body.description === "string" ? body.description : undefined;
    const taxonomy = await createProductTaxonomyValue(kind, {
      name,
      description
    });

    return NextResponse.json({
      ok: true,
      taxonomy,
      message: `${taxonomy.name} wurde hinzugefuegt.`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Taxonomy could not be created.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
