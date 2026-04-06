import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getAdminEditableProduct } from "@/lib/server/admin-products";
import { revalidateShopCatalog } from "@/lib/server/catalog-revalidation";
import { getCurrentSession } from "@/lib/server/admin-session";
import { syncProductStatusToShopify } from "@/lib/server/product-publication";
import { isAdminRole } from "@/shared/firebase/roles";

function nowIso() {
  return new Date().toISOString();
}

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

export async function POST() {
  const authError = await requireAdminRequest();
  if (authError) {
    return authError;
  }

  const timestamp = nowIso();
  const productRef = getAdminDb().collection("products").doc();
  const defaultVariantId = "default";
  const productDoc = {
    title: "Neues Produkt",
    slug: `produkt-${productRef.id.slice(0, 8)}`,
    shortDescription: "Neue Kurzbeschreibung",
    longDescription: "Neue ausfuehrliche Beschreibung",
    category: "lasergravur",
    shopCategory: "alle-glaeser",
    glassType: "Sektglaeser",
    collection: "Flo's Designs",
    collectionSlug: "flo",
    designer: "Flo",
    occasion: "Geburtstag",
    featured: false,
    care: "Pflegehinweis ergaenzen",
    benefits: ["Benefit ergaenzen"],
    rating: 5,
    reviews: 0,
    status: "draft" as const,
    shopifySyncStatus: "pending" as const,
    shopifyLastAttemptedAt: timestamp,
    isPersonalizable: true,
    defaultVariantId,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const defaultVariantDoc = {
    sku: `SKU-${productRef.id.slice(0, 8).toUpperCase()}`,
    name: "Standard",
    priceCents: 0,
    currency: "EUR",
    stockMode: "unlimited",
    isActive: true,
    productionTimeDays: 3,
    sortOrder: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const batch = getAdminDb().batch();
  batch.set(productRef, productDoc);
  batch.set(productRef.collection("variants").doc(defaultVariantId), defaultVariantDoc);

  await batch.commit();

  const product = await getAdminEditableProduct(productRef.id);
  if (!product) {
    return NextResponse.json({ error: "Product not found after creation." }, { status: 404 });
  }

  const shopifySync = await syncProductStatusToShopify({
    productId: productRef.id,
    product
  });
  revalidateShopCatalog({
    currentProduct: product
  });

  return NextResponse.json({
    success: true,
    productId: productRef.id,
    shopifySync
  });
}
