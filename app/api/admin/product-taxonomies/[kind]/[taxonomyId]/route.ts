import { NextResponse } from "next/server";
import { revalidateShopCatalog, getTaxonomyRevalidationPaths } from "@/lib/server/catalog-revalidation";
import { getAdminEditableProduct } from "@/lib/server/admin-products";
import { getCurrentSession } from "@/lib/server/admin-session";
import { syncProductStatusToShopify } from "@/lib/server/product-publication";
import {
  deleteProductTaxonomyValue,
  getProductTaxonomyOption,
  updateProductTaxonomyValue
} from "@/lib/server/product-taxonomies";
import { productTaxonomyKindSchema } from "@/shared/catalog";
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ kind: string; taxonomyId: string }> }
) {
  const authError = await requireAdminRequest();
  if (authError) {
    return authError;
  }

  try {
    const { kind: rawKind, taxonomyId } = await context.params;
    const kind = productTaxonomyKindSchema.parse(rawKind);
    const previous = await getProductTaxonomyOption(kind, taxonomyId);
    if (!previous) {
      return NextResponse.json({ error: "Taxonomy value not found." }, { status: 404 });
    }

    const body = (await request.json()) as {
      name?: unknown;
      description?: unknown;
    };

    const result = await updateProductTaxonomyValue(kind, taxonomyId, {
      name: typeof body.name === "string" ? body.name : "",
      description: typeof body.description === "string" ? body.description : undefined
    });

    revalidateShopCatalog({
      extraPaths: [
        ...result.affectedProductIds.map((productId) => `/products/${productId}`),
        ...getTaxonomyRevalidationPaths({
          kind,
          previousSlug: previous.slug,
          nextSlug: result.taxonomy.slug,
          previousName: previous.name,
          nextName: result.taxonomy.name
        })
      ]
    });

    return NextResponse.json({
      ok: true,
      taxonomy: result.taxonomy,
      affectedProductIds: result.affectedProductIds,
      draftedProductIds: result.draftedProductIds,
      message: `${result.taxonomy.name} wurde global aktualisiert.`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Taxonomy could not be updated.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ kind: string; taxonomyId: string }> }
) {
  const authError = await requireAdminRequest();
  if (authError) {
    return authError;
  }

  try {
    const { kind: rawKind, taxonomyId } = await context.params;
    const kind = productTaxonomyKindSchema.parse(rawKind);
    const previous = await getProductTaxonomyOption(kind, taxonomyId);
    if (!previous) {
      return NextResponse.json({ error: "Taxonomy value not found." }, { status: 404 });
    }

    const result = await deleteProductTaxonomyValue(kind, taxonomyId);
    const syncFailures: string[] = [];

    for (const productId of result.draftedProductIds) {
      try {
        const product = await getAdminEditableProduct(productId);
        if (!product) {
          continue;
        }

        await syncProductStatusToShopify({
          productId,
          product
        });
      } catch {
        syncFailures.push(productId);
      }
    }

    revalidateShopCatalog({
      extraPaths: [
        ...result.affectedProductIds.map((productId) => `/products/${productId}`),
        ...getTaxonomyRevalidationPaths({
          kind,
          previousSlug: previous.slug,
          previousName: previous.name
        })
      ]
    });

    return NextResponse.json({
      ok: true,
      taxonomy: result.taxonomy,
      affectedProductIds: result.affectedProductIds,
      draftedProductIds: result.draftedProductIds,
      syncFailures,
      message: `${result.taxonomy.name} wurde geloescht. ${result.draftedProductIds.length} Produkte wurden auf Draft gesetzt.`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Taxonomy could not be deleted.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
