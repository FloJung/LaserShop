import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getAdminEditableProduct } from "@/lib/server/admin-products";
import { getCurrentSession } from "@/lib/server/admin-session";
import { editableProductPayloadSchema } from "@/shared/catalog";
import { isAdminRole } from "@/shared/firebase/roles";

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueById<T extends { id: string }>(items: T[], label: string) {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) {
      throw new Error(`${label} enthält doppelte IDs: ${item.id}`);
    }

    seen.add(item.id);
  }
}

function normalizePayload(input: unknown) {
  const parsed = editableProductPayloadSchema.parse(input);

  uniqueById(parsed.variants, "Varianten");
  uniqueById(parsed.images, "Bilder");
  uniqueById(parsed.options, "Optionen");

  for (const option of parsed.options) {
    uniqueById(option.values, `Optionswerte für ${option.name}`);
    if (option.type === "select" && option.values.length === 0) {
      throw new Error(`Die Select-Option "${option.name}" benötigt mindestens einen Wert.`);
    }
  }

  const normalizedImages = parsed.images.map((image, index) => ({
    ...image,
    sortOrder: index
  }));

  const primaryImageId =
    normalizedImages.find((image) => image.isPrimary)?.id ?? normalizedImages[0]?.id;

  const images = normalizedImages.map((image) => ({
    ...image,
    isPrimary: image.id === primaryImageId
  }));

  const variants = parsed.variants.map((variant, index) => ({
    ...variant,
    sortOrder: index
  }));

  const firstActiveVariantId = variants.find((variant) => variant.isActive)?.id ?? variants[0]?.id;
  const defaultVariantId =
    parsed.defaultVariantId && variants.some((variant) => variant.id === parsed.defaultVariantId)
      ? parsed.defaultVariantId
      : firstActiveVariantId;

  const options = parsed.options.map((option, optionIndex) => ({
    ...option,
    code: option.code.trim() || slugify(option.name),
    sortOrder: optionIndex,
    values:
      option.type === "select"
        ? option.values.map((value, valueIndex) => ({
            ...value,
            sortOrder: valueIndex
          }))
        : []
  }));

  return {
    ...parsed,
    slug: parsed.slug.trim() || slugify(parsed.title),
    defaultVariantId,
    images,
    variants,
    options
  };
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

async function commitDeleteChunks(paths: Array<{ path: string }>) {
  const db = getAdminDb();

  for (let index = 0; index < paths.length; index += 400) {
    const batch = db.batch();
    const chunk = paths.slice(index, index + 400);

    for (const entry of chunk) {
      batch.delete(db.doc(entry.path));
    }

    await batch.commit();
  }
}

export async function GET(_: Request, context: { params: Promise<{ productId: string }> }) {
  const authError = await requireAdminRequest();
  if (authError) {
    return authError;
  }

  const { productId } = await context.params;
  const product = await getAdminEditableProduct(productId);
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PUT(request: Request, context: { params: Promise<{ productId: string }> }) {
  const authError = await requireAdminRequest();
  if (authError) {
    return authError;
  }

  const { productId } = await context.params;
  const existingProduct = await getAdminEditableProduct(productId);
  if (!existingProduct) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  let payload: ReturnType<typeof normalizePayload>;
  try {
    payload = normalizePayload(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const db = getAdminDb();
  const timestamp = nowIso();
  const productRef = db.collection("products").doc(productId);
  const batch = db.batch();

  batch.set(
    productRef,
    {
      title: payload.title,
      slug: payload.slug,
      shortDescription: payload.shortDescription,
      longDescription: payload.longDescription,
      category: payload.category,
      shopCategory: payload.shopCategory,
      glassType: payload.glassType,
      collection: payload.collection,
      collectionSlug: payload.collectionSlug,
      designer: payload.designer,
      occasion: payload.occasion,
      ...(payload.badge ? { badge: payload.badge } : {}),
      featured: payload.featured,
      care: payload.care,
      benefits: payload.benefits,
      rating: payload.rating,
      reviews: payload.reviews,
      status: payload.status,
      isPersonalizable: payload.isPersonalizable,
      defaultVariantId: payload.defaultVariantId,
      createdAt: existingProduct.createdAt,
      updatedAt: timestamp
    },
    { merge: false }
  );

  const existingVariantMap = new Map(existingProduct.variants.map((variant) => [variant.id, variant]));
  const incomingVariantIds = new Set(payload.variants.map((variant) => variant.id));
  for (const variant of existingProduct.variants) {
    if (!incomingVariantIds.has(variant.id)) {
      batch.delete(productRef.collection("variants").doc(variant.id));
    }
  }

  for (const variant of payload.variants) {
    batch.set(productRef.collection("variants").doc(variant.id), {
      sku: variant.sku,
      name: variant.name,
      priceCents: variant.priceCents,
      ...(typeof variant.compareAtPriceCents === "number" ? { compareAtPriceCents: variant.compareAtPriceCents } : {}),
      currency: variant.currency,
      stockMode: variant.stockMode,
      ...(typeof variant.stockQuantity === "number" ? { stockQuantity: variant.stockQuantity } : {}),
      isActive: variant.isActive,
      ...(typeof variant.weightGrams === "number" ? { weightGrams: variant.weightGrams } : {}),
      productionTimeDays: variant.productionTimeDays,
      sortOrder: variant.sortOrder,
      createdAt: existingVariantMap.get(variant.id)?.createdAt ?? timestamp,
      updatedAt: timestamp
    });
  }

  const existingImageMap = new Map(existingProduct.images.map((image) => [image.id, image]));
  const incomingImageIds = new Set(payload.images.map((image) => image.id));
  for (const image of existingProduct.images) {
    if (!incomingImageIds.has(image.id)) {
      batch.delete(productRef.collection("images").doc(image.id));
    }
  }

  for (const image of payload.images) {
    const existingImage = existingImageMap.get(image.id);
    batch.set(productRef.collection("images").doc(image.id), {
      storagePath: image.storagePath || existingImage?.storagePath || image.url,
      url: image.url,
      altText: image.altText,
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary,
      createdAt: existingImage?.createdAt ?? timestamp
    });
  }

  const existingOptionMap = new Map(existingProduct.options.map((option) => [option.id, option]));
  const incomingOptionIds = new Set(payload.options.map((option) => option.id));
  for (const option of existingProduct.options) {
    if (!incomingOptionIds.has(option.id)) {
      for (const value of option.values) {
        batch.delete(productRef.collection("options").doc(option.id).collection("values").doc(value.id));
      }

      batch.delete(productRef.collection("options").doc(option.id));
    }
  }

  for (const option of payload.options) {
    const existingOption = existingOptionMap.get(option.id);
    const optionRef = productRef.collection("options").doc(option.id);
    batch.set(optionRef, {
      name: option.name,
      code: option.code,
      type: option.type,
      isRequired: option.isRequired,
      ...(option.helpText ? { helpText: option.helpText } : {}),
      ...(option.placeholder ? { placeholder: option.placeholder } : {}),
      ...(typeof option.maxLength === "number" ? { maxLength: option.maxLength } : {}),
      ...(typeof option.priceModifierCents === "number" ? { priceModifierCents: option.priceModifierCents } : {}),
      pricingMode: option.pricingMode,
      sortOrder: option.sortOrder,
      isActive: option.isActive,
      ...(option.acceptedMimeTypes?.length ? { acceptedMimeTypes: option.acceptedMimeTypes } : {}),
      createdAt: existingOption?.createdAt ?? timestamp,
      updatedAt: timestamp
    });

    const incomingValueIds = new Set(option.values.map((value) => value.id));

    for (const existingValue of existingOption?.values ?? []) {
      if (!incomingValueIds.has(existingValue.id)) {
        batch.delete(optionRef.collection("values").doc(existingValue.id));
      }
    }

    for (const value of option.values) {
      batch.set(optionRef.collection("values").doc(value.id), {
        label: value.label,
        value: value.value,
        sortOrder: value.sortOrder,
        ...(typeof value.priceModifierCents === "number" ? { priceModifierCents: value.priceModifierCents } : {}),
        isActive: value.isActive
      });
    }
  }

  await batch.commit();

  return NextResponse.json({
    success: true,
    productId,
    updatedAt: timestamp
  });
}

export async function DELETE(_: Request, context: { params: Promise<{ productId: string }> }) {
  const authError = await requireAdminRequest();
  if (authError) {
    return authError;
  }

  const { productId } = await context.params;
  const existingProduct = await getAdminEditableProduct(productId);
  if (!existingProduct) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const deletePaths: Array<{ path: string }> = [];
  const productBasePath = `products/${productId}`;

  for (const variant of existingProduct.variants) {
    deletePaths.push({
      path: `${productBasePath}/variants/${variant.id}`
    });
  }

  for (const image of existingProduct.images) {
    deletePaths.push({
      path: `${productBasePath}/images/${image.id}`
    });
  }

  for (const option of existingProduct.options) {
    for (const value of option.values) {
      deletePaths.push({
        path: `${productBasePath}/options/${option.id}/values/${value.id}`
      });
    }

    deletePaths.push({
      path: `${productBasePath}/options/${option.id}`
    });
  }

  deletePaths.push({ path: productBasePath });
  await commitDeleteChunks(deletePaths);

  return NextResponse.json({
    success: true,
    productId
  });
}
