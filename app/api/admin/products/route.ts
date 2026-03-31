import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentSession } from "@/lib/server/admin-session";
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

  const batch = getAdminDb().batch();
  batch.set(productRef, {
    title: "Neues Produkt",
    slug: `produkt-${productRef.id.slice(0, 8)}`,
    shortDescription: "Neue Kurzbeschreibung",
    longDescription: "Neue ausführliche Beschreibung",
    category: "lasergravur",
    shopCategory: "alle-glaeser",
    glassType: "Sektgläser",
    collection: "Flo's Designs",
    collectionSlug: "flo",
    designer: "Flo",
    occasion: "Geburtstag",
    featured: false,
    care: "Pflegehinweis ergänzen",
    benefits: ["Benefit ergänzen"],
    rating: 5,
    reviews: 0,
    status: "draft",
    isPersonalizable: true,
    defaultVariantId,
    createdAt: timestamp,
    updatedAt: timestamp
  });

  batch.set(productRef.collection("variants").doc(defaultVariantId), {
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
  });

  await batch.commit();

  return NextResponse.json({
    success: true,
    productId: productRef.id
  });
}
