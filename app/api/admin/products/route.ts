import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentSession } from "@/lib/server/admin-session";
import { syncProductToShopifyDetailed } from "@/lib/server/shopify";
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

  const shopifySync = await syncProductToShopifyDetailed({
    localProductId: productRef.id,
    localVariantId: defaultVariantId,
    title: productDoc.title,
    description: productDoc.longDescription,
    price: defaultVariantDoc.priceCents / 100,
    sku: defaultVariantDoc.sku,
    status: productDoc.status
  });

  return NextResponse.json({
    success: true,
    productId: productRef.id,
    shopifySync
  });
}
