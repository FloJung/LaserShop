import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { collections as staticCollections, glassTypes as staticGlassTypes, occasions as staticOccasions, products as staticProducts, shopCategories as staticShopCategories } from "@/lib/data/products";
import type { DesignerCollection, ShopCategory, TaxonomyOption } from "@/lib/types";
import type { ProductDocument, ProductTaxonomyDocument, ProductTaxonomyKind } from "@/shared/catalog";
import { PRODUCT_TAXONOMY_KINDS, productTaxonomyDocumentSchema } from "@/shared/catalog";

type ProductTaxonomyConfig = {
  collectionName: string;
  idField: keyof Pick<
    ProductDocument,
    "categoryId" | "shopCategoryId" | "glassTypeId" | "occasionId" | "collectionId" | "designerId"
  >;
};

export type ProductTaxonomyOption = ProductTaxonomyDocument & {
  id: string;
  kind: ProductTaxonomyKind;
};

export type ProductTaxonomyCatalog = Record<ProductTaxonomyKind, ProductTaxonomyOption[]>;

type TaxonomyValueInput = {
  name: string;
  description?: string;
};

type TaxonomyMutationResult = {
  taxonomy: ProductTaxonomyOption;
  affectedProductIds: string[];
  draftedProductIds: string[];
};

const PRODUCT_TAXONOMY_CONFIG: Record<ProductTaxonomyKind, ProductTaxonomyConfig> = {
  category: {
    collectionName: "productCategories",
    idField: "categoryId"
  },
  shopCategory: {
    collectionName: "productShopCategories",
    idField: "shopCategoryId"
  },
  glassType: {
    collectionName: "productGlassTypes",
    idField: "glassTypeId"
  },
  occasion: {
    collectionName: "productOccasions",
    idField: "occasionId"
  },
  collection: {
    collectionName: "productCollections",
    idField: "collectionId"
  },
  designer: {
    collectionName: "productDesigners",
    idField: "designerId"
  }
};

function nowIso() {
  return new Date().toISOString();
}

export function slugifyTaxonomyValue(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeMatchValue(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function getTaxonomyCollection(kind: ProductTaxonomyKind) {
  return getAdminDb().collection(PRODUCT_TAXONOMY_CONFIG[kind].collectionName);
}

function toTaxonomyOption(kind: ProductTaxonomyKind, id: string, data: unknown): ProductTaxonomyOption {
  return {
    id,
    kind,
    ...productTaxonomyDocumentSchema.parse(data)
  };
}

function buildStaticCatalog(): ProductTaxonomyCatalog {
  const timestamp = "static";
  const categoryNames = Array.from(new Set(["lasergravur", ...staticProducts.flatMap((product) => product.category ?? [])]));
  const designerNames = Array.from(new Set([...staticCollections.map((collection) => collection.creator), ...staticProducts.map((product) => product.designer)]));

  const categoryOptions = categoryNames.map((name, index) => ({
    id: `static-category-${slugifyTaxonomyValue(name)}`,
    kind: "category" as const,
    name,
    slug: slugifyTaxonomyValue(name),
    sortOrder: index,
    createdAt: timestamp,
    updatedAt: timestamp
  }));

  const shopCategoryOptions = staticShopCategories.map((category, index) => ({
    id: `static-shop-category-${category.slug}`,
    kind: "shopCategory" as const,
    name: category.name,
    slug: category.slug,
    description: category.description,
    sortOrder: index,
    createdAt: timestamp,
    updatedAt: timestamp
  }));

  const glassTypeOptions = staticGlassTypes.map((name, index) => ({
    id: `static-glass-type-${slugifyTaxonomyValue(name)}`,
    kind: "glassType" as const,
    name,
    slug: slugifyTaxonomyValue(name),
    sortOrder: index,
    createdAt: timestamp,
    updatedAt: timestamp
  }));

  const occasionOptions = staticOccasions.map((name, index) => ({
    id: `static-occasion-${slugifyTaxonomyValue(name)}`,
    kind: "occasion" as const,
    name,
    slug: slugifyTaxonomyValue(name),
    sortOrder: index,
    createdAt: timestamp,
    updatedAt: timestamp
  }));

  const collectionOptions = staticCollections.map((collection, index) => ({
    id: `static-collection-${collection.slug}`,
    kind: "collection" as const,
    name: collection.name,
    slug: collection.slug,
    description: collection.description,
    sortOrder: index,
    createdAt: timestamp,
    updatedAt: timestamp
  }));

  const designerOptions = designerNames.map((name, index) => ({
    id: `static-designer-${slugifyTaxonomyValue(name)}`,
    kind: "designer" as const,
    name,
    slug: slugifyTaxonomyValue(name),
    sortOrder: index,
    createdAt: timestamp,
    updatedAt: timestamp
  }));

  return {
    category: categoryOptions,
    shopCategory: shopCategoryOptions,
    glassType: glassTypeOptions,
    occasion: occasionOptions,
    collection: collectionOptions,
    designer: designerOptions
  };
}

async function buildSeedEntries(kind: ProductTaxonomyKind) {
  const staticCatalog = buildStaticCatalog();
  const seeded = new Map(staticCatalog[kind].map((entry) => [normalizeMatchValue(entry.slug || entry.name), entry]));
  const snapshot = await getAdminDb().collection("products").get();

  for (const doc of snapshot.docs) {
    const data = doc.data() as Partial<ProductDocument>;
    const value =
      kind === "category"
        ? data.category
        : kind === "shopCategory"
          ? data.shopCategory
          : kind === "glassType"
            ? data.glassType
            : kind === "occasion"
              ? data.occasion
              : kind === "collection"
                ? data.collection
                : data.designer;

    if (!value?.trim()) {
      continue;
    }

    const slug =
      kind === "shopCategory"
        ? value.trim()
        : kind === "collection" && data.collectionSlug?.trim()
          ? data.collectionSlug.trim()
          : slugifyTaxonomyValue(value);

    const key = normalizeMatchValue(slug || value);
    if (seeded.has(key)) {
      continue;
    }

    seeded.set(key, {
      id: `seed-${kind}-${slug}`,
      kind,
      name: value.trim(),
      slug,
      sortOrder: seeded.size,
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
  }

  return Array.from(seeded.values()).sort((left, right) => left.sortOrder - right.sortOrder);
}

export async function ensureProductTaxonomiesSeeded() {
  if (!isFirebaseAdminConfigured()) {
    return;
  }

  const db = getAdminDb();

  for (const kind of PRODUCT_TAXONOMY_KINDS) {
    const ref = db.collection(PRODUCT_TAXONOMY_CONFIG[kind].collectionName);
    const existing = await ref.limit(1).get();
    if (!existing.empty) {
      continue;
    }

    const seeds = await buildSeedEntries(kind);
    if (seeds.length === 0) {
      continue;
    }

    const batch = db.batch();
    for (const seed of seeds) {
      batch.set(ref.doc(seed.id), {
        name: seed.name,
        slug: seed.slug,
        ...(seed.description ? { description: seed.description } : {}),
        sortOrder: seed.sortOrder,
        createdAt: seed.createdAt,
        updatedAt: seed.updatedAt
      });
    }
    await batch.commit();
  }
}

export async function getProductTaxonomyCatalog(): Promise<ProductTaxonomyCatalog> {
  if (!isFirebaseAdminConfigured()) {
    return buildStaticCatalog();
  }

  await ensureProductTaxonomiesSeeded();

  const entries = await Promise.all(
    PRODUCT_TAXONOMY_KINDS.map(async (kind) => {
      const snapshot = await getTaxonomyCollection(kind).orderBy("sortOrder", "asc").get();
      return [
        kind,
        snapshot.docs.map((doc) => toTaxonomyOption(kind, doc.id, doc.data()))
      ] as const;
    })
  );

  return Object.fromEntries(entries) as ProductTaxonomyCatalog;
}

export async function getProductTaxonomyOptions(kind: ProductTaxonomyKind) {
  return (await getProductTaxonomyCatalog())[kind];
}

export async function getProductTaxonomyOption(kind: ProductTaxonomyKind, id: string) {
  return (await getProductTaxonomyOptions(kind)).find((entry) => entry.id === id) ?? null;
}

function findTaxonomyOption(
  options: ProductTaxonomyOption[],
  input: {
    id?: string;
    name?: string;
    slug?: string;
  }
) {
  if (input.id?.trim()) {
    const id = input.id.trim();
    return options.find((entry) => entry.id === id) ?? null;
  }

  if (input.slug?.trim()) {
    const slug = normalizeMatchValue(input.slug);
    return options.find((entry) => normalizeMatchValue(entry.slug) === slug) ?? null;
  }

  if (input.name?.trim()) {
    const name = normalizeMatchValue(input.name);
    return options.find((entry) => normalizeMatchValue(entry.name) === name) ?? null;
  }

  return null;
}

export async function resolveProductTaxonomyFields(
  input: Pick<
    ProductDocument,
    | "category"
    | "categoryId"
    | "shopCategory"
    | "shopCategoryId"
    | "glassType"
    | "glassTypeId"
    | "occasion"
    | "occasionId"
    | "collection"
    | "collectionId"
    | "collectionSlug"
    | "designer"
    | "designerId"
  >,
  catalogInput?: ProductTaxonomyCatalog
) {
  const catalog = catalogInput ?? (await getProductTaxonomyCatalog());
  const category = findTaxonomyOption(catalog.category, {
    id: input.categoryId,
    name: input.category
  });
  const shopCategory = findTaxonomyOption(catalog.shopCategory, {
    id: input.shopCategoryId,
    slug: input.shopCategory
  });
  const glassType = findTaxonomyOption(catalog.glassType, {
    id: input.glassTypeId,
    name: input.glassType
  });
  const occasion = findTaxonomyOption(catalog.occasion, {
    id: input.occasionId,
    name: input.occasion
  });
  const collection = findTaxonomyOption(catalog.collection, {
    id: input.collectionId,
    slug: input.collectionSlug,
    name: input.collection
  });
  const designer = findTaxonomyOption(catalog.designer, {
    id: input.designerId,
    name: input.designer
  });

  return {
    category: category?.name ?? input.category.trim(),
    categoryId: category?.id,
    shopCategory: shopCategory?.slug ?? input.shopCategory.trim(),
    shopCategoryId: shopCategory?.id,
    glassType: glassType?.name ?? input.glassType.trim(),
    glassTypeId: glassType?.id,
    occasion: occasion?.name ?? input.occasion.trim(),
    occasionId: occasion?.id,
    collection: collection?.name ?? input.collection.trim(),
    collectionId: collection?.id,
    collectionSlug: collection?.slug ?? input.collectionSlug.trim(),
    designer: designer?.name ?? input.designer.trim(),
    designerId: designer?.id
  };
}

function assertTaxonomyUniqueness(
  kind: ProductTaxonomyKind,
  options: ProductTaxonomyOption[],
  input: {
    id?: string;
    name: string;
    slug: string;
  }
) {
  const normalizedName = normalizeMatchValue(input.name);
  const normalizedSlug = normalizeMatchValue(input.slug);

  const duplicateName = options.find(
    (entry) => entry.id !== input.id && normalizeMatchValue(entry.name) === normalizedName
  );
  if (duplicateName) {
    throw new Error(`"${input.name}" existiert bereits in ${kind}.`);
  }

  const duplicateSlug = options.find(
    (entry) => entry.id !== input.id && normalizeMatchValue(entry.slug) === normalizedSlug
  );
  if (duplicateSlug) {
    throw new Error(`Der Slug "${input.slug}" existiert bereits in ${kind}.`);
  }
}

function buildProductTaxonomyMutationPatch(
  kind: ProductTaxonomyKind,
  taxonomy: ProductTaxonomyOption | null
) {
  if (!taxonomy) {
    if (kind === "category") {
      return {
        category: "",
        categoryId: FieldValue.delete()
      };
    }

    if (kind === "shopCategory") {
      return {
        shopCategory: "",
        shopCategoryId: FieldValue.delete()
      };
    }

    if (kind === "glassType") {
      return {
        glassType: "",
        glassTypeId: FieldValue.delete()
      };
    }

    if (kind === "occasion") {
      return {
        occasion: "",
        occasionId: FieldValue.delete()
      };
    }

    if (kind === "collection") {
      return {
        collection: "",
        collectionId: FieldValue.delete(),
        collectionSlug: ""
      };
    }

    return {
      designer: "",
      designerId: FieldValue.delete()
    };
  }

  if (kind === "category") {
    return {
      category: taxonomy.name,
      categoryId: taxonomy.id
    };
  }

  if (kind === "shopCategory") {
    return {
      shopCategory: taxonomy.slug,
      shopCategoryId: taxonomy.id
    };
  }

  if (kind === "glassType") {
    return {
      glassType: taxonomy.name,
      glassTypeId: taxonomy.id
    };
  }

  if (kind === "occasion") {
    return {
      occasion: taxonomy.name,
      occasionId: taxonomy.id
    };
  }

  if (kind === "collection") {
    return {
      collection: taxonomy.name,
      collectionId: taxonomy.id,
      collectionSlug: taxonomy.slug
    };
  }

  return {
    designer: taxonomy.name,
    designerId: taxonomy.id
  };
}

async function listAffectedProductIds(kind: ProductTaxonomyKind, taxonomy: ProductTaxonomyOption) {
  const db = getAdminDb();
  const idField = PRODUCT_TAXONOMY_CONFIG[kind].idField;
  const matches = new Set<string>();

  const snapshots = (await Promise.all(
    [
      db.collection("products").where(idField, "==", taxonomy.id).get(),
      kind === "category" ? db.collection("products").where("category", "==", taxonomy.name).get() : null,
      kind === "shopCategory" ? db.collection("products").where("shopCategory", "==", taxonomy.slug).get() : null,
      kind === "glassType" ? db.collection("products").where("glassType", "==", taxonomy.name).get() : null,
      kind === "occasion" ? db.collection("products").where("occasion", "==", taxonomy.name).get() : null,
      kind === "collection" ? db.collection("products").where("collectionSlug", "==", taxonomy.slug).get() : null,
      kind === "collection" ? db.collection("products").where("collection", "==", taxonomy.name).get() : null,
      kind === "designer" ? db.collection("products").where("designer", "==", taxonomy.name).get() : null
    ].filter(Boolean)
  )).filter(isDefined);

  for (const snapshot of snapshots) {
    for (const doc of snapshot.docs) {
      matches.add(doc.id);
    }
  }

  return Array.from(matches);
}

async function updateProductsForTaxonomyMutation(input: {
  kind: ProductTaxonomyKind;
  currentTaxonomy: ProductTaxonomyOption;
  nextTaxonomy: ProductTaxonomyOption | null;
  draftProducts: boolean;
}) {
  const db = getAdminDb();
  const timestamp = nowIso();
  const productIds = await listAffectedProductIds(input.kind, input.currentTaxonomy);
  const draftedProductIds: string[] = [];

  for (let index = 0; index < productIds.length; index += 400) {
    const batch = db.batch();
    for (const productId of productIds.slice(index, index + 400)) {
      const patch = buildProductTaxonomyMutationPatch(input.kind, input.nextTaxonomy);
      if (input.draftProducts) {
        draftedProductIds.push(productId);
      }

      batch.set(
        db.collection("products").doc(productId),
        {
          ...patch,
          ...(input.draftProducts ? { status: "draft" } : {}),
          shopifySyncStatus: "pending",
          shopifyLastAttemptedAt: timestamp,
          updatedAt: timestamp
        },
        { merge: true }
      );
    }

    await batch.commit();
  }

  return {
    affectedProductIds: productIds,
    draftedProductIds
  };
}

export async function createProductTaxonomyValue(kind: ProductTaxonomyKind, input: TaxonomyValueInput) {
  if (!isFirebaseAdminConfigured()) {
    throw new Error("Taxonomy management requires Firebase Admin.");
  }

  const options = await getProductTaxonomyOptions(kind);
  const name = input.name.trim();
  if (!name) {
    throw new Error("Name fehlt.");
  }

  const slug = slugifyTaxonomyValue(name);
  if (!slug) {
    throw new Error("Es konnte kein gueltiger Slug erzeugt werden.");
  }

  assertTaxonomyUniqueness(kind, options, { name, slug });

  const timestamp = nowIso();
  const ref = getTaxonomyCollection(kind).doc();
  const taxonomy = {
    id: ref.id,
    kind,
    name,
    slug,
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    sortOrder: options.length,
    createdAt: timestamp,
    updatedAt: timestamp
  } satisfies ProductTaxonomyOption;

  await ref.set({
    name: taxonomy.name,
    slug: taxonomy.slug,
    ...(taxonomy.description ? { description: taxonomy.description } : {}),
    sortOrder: taxonomy.sortOrder,
    createdAt: taxonomy.createdAt,
    updatedAt: taxonomy.updatedAt
  });

  return taxonomy;
}

export async function updateProductTaxonomyValue(kind: ProductTaxonomyKind, id: string, input: TaxonomyValueInput): Promise<TaxonomyMutationResult> {
  if (!isFirebaseAdminConfigured()) {
    throw new Error("Taxonomy management requires Firebase Admin.");
  }

  const current = await getProductTaxonomyOption(kind, id);
  if (!current) {
    throw new Error("Taxonomy value not found.");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Name fehlt.");
  }

  const slug = slugifyTaxonomyValue(name);
  if (!slug) {
    throw new Error("Es konnte kein gueltiger Slug erzeugt werden.");
  }

  const options = await getProductTaxonomyOptions(kind);
  assertTaxonomyUniqueness(kind, options, { id, name, slug });

  const timestamp = nowIso();
  const updatedTaxonomy: ProductTaxonomyOption = {
    ...current,
    name,
    slug,
    description: input.description?.trim() || current.description,
    updatedAt: timestamp
  };

  await getTaxonomyCollection(kind).doc(id).set(
    {
      name: updatedTaxonomy.name,
      slug: updatedTaxonomy.slug,
      ...(updatedTaxonomy.description ? { description: updatedTaxonomy.description } : { description: FieldValue.delete() }),
      updatedAt: updatedTaxonomy.updatedAt
    },
    { merge: true }
  );

  const mutation = await updateProductsForTaxonomyMutation({
    kind,
    currentTaxonomy: current,
    nextTaxonomy: updatedTaxonomy,
    draftProducts: false
  });

  return {
    taxonomy: updatedTaxonomy,
    ...mutation
  };
}

export async function deleteProductTaxonomyValue(kind: ProductTaxonomyKind, id: string): Promise<TaxonomyMutationResult> {
  if (!isFirebaseAdminConfigured()) {
    throw new Error("Taxonomy management requires Firebase Admin.");
  }

  const current = await getProductTaxonomyOption(kind, id);
  if (!current) {
    throw new Error("Taxonomy value not found.");
  }

  const mutation = await updateProductsForTaxonomyMutation({
    kind,
    currentTaxonomy: current,
    nextTaxonomy: null,
    draftProducts: true
  });

  await getTaxonomyCollection(kind).doc(id).delete();

  return {
    taxonomy: current,
    ...mutation
  };
}

function getCollectionAccent(index: number) {
  return ["from-amber-400 to-orange-500", "from-cyan-400 to-blue-500", "from-emerald-400 to-teal-500", "from-rose-400 to-orange-400"][index % 4];
}

function getStaticCollectionVisual(slug: string) {
  return staticCollections.find((collection) => collection.slug === slug);
}

function getFirstCollectionImage(slug: string) {
  return staticProducts.find((product) => product.collectionSlug === slug)?.image ?? staticProducts[0]?.image ?? "/images/glas/2er-set-weinglas-ringe-personalisiert-699d1e.jpg";
}

export async function getStorefrontCollections(): Promise<DesignerCollection[]> {
  if (!isFirebaseAdminConfigured()) {
    return staticCollections;
  }

  const [catalog, productsSnapshot] = await Promise.all([
    getProductTaxonomyCatalog(),
    getAdminDb().collection("products").where("status", "==", "active").get()
  ]);

  const products = productsSnapshot.docs.map((doc) => doc.data() as Partial<ProductDocument>);

  return catalog.collection.map((entry, index) => {
    const staticMatch = getStaticCollectionVisual(entry.slug);
    const matchedProducts = products.filter(
      (product) => product.collectionId === entry.id || product.collectionSlug === entry.slug || product.collection === entry.name
    );
    const creator =
      matchedProducts.find((product) => product.designer?.trim())?.designer ??
      staticMatch?.creator ??
      "Designer";

    return {
      id: entry.id,
      slug: entry.slug,
      name: entry.name,
      creator,
      description: entry.description ?? staticMatch?.description ?? `${entry.name} als kuratierte Designwelt im Shop.`,
      image: staticMatch?.image ?? getFirstCollectionImage(entry.slug),
      accent: staticMatch?.accent ?? getCollectionAccent(index),
      productCount: matchedProducts.length
    };
  });
}

export async function getStorefrontShopCategories(): Promise<ShopCategory[]> {
  if (!isFirebaseAdminConfigured()) {
    return staticShopCategories;
  }

  const catalog = await getProductTaxonomyCatalog();
  return catalog.shopCategory.map((entry) => ({
    id: entry.id,
    slug: entry.slug,
    name: entry.name,
    description: entry.description ?? `${entry.name} im Shop durchsuchen.`
  }));
}

export async function getStorefrontFilterOptions(): Promise<{
  collections: DesignerCollection[];
  glassTypes: TaxonomyOption[];
  occasions: TaxonomyOption[];
  shopCategories: ShopCategory[];
}> {
  if (!isFirebaseAdminConfigured()) {
    return {
      collections: staticCollections,
      glassTypes: staticGlassTypes.map((name) => ({ slug: slugifyTaxonomyValue(name), name })),
      occasions: staticOccasions.map((name) => ({ slug: slugifyTaxonomyValue(name), name })),
      shopCategories: staticShopCategories
    };
  }

  const [catalog, collections, shopCategories] = await Promise.all([
    getProductTaxonomyCatalog(),
    getStorefrontCollections(),
    getStorefrontShopCategories()
  ]);

  return {
    collections,
    glassTypes: catalog.glassType.map((entry) => ({
      id: entry.id,
      slug: entry.slug,
      name: entry.name
    })),
    occasions: catalog.occasion.map((entry) => ({
      id: entry.id,
      slug: entry.slug,
      name: entry.name
    })),
    shopCategories
  };
}
