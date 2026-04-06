import "server-only";

import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { unstable_noStore as noStore } from "next/cache";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { normalizeLegacyProductImage } from "@/lib/server/product-image-normalization";
import { getProductTaxonomyCatalog, resolveProductTaxonomyFields, type ProductTaxonomyCatalog } from "@/lib/server/product-taxonomies";
import { products as staticProducts } from "@/lib/data/products";
import { isProductVisibleInShop } from "@/lib/server/product-publication";
import { validateProductForPublishing } from "@/lib/server/product-publication";
import type { Product } from "@/lib/types";
import {
  productDocumentSchema,
  productOptionDocumentSchema,
  productOptionValueDocumentSchema,
  productVariantDocumentSchema
} from "@/shared/catalog";
import type { StorefrontOption } from "@/shared/catalog";

type StorefrontVariant = {
  id: string;
  name: string;
  sku: string;
  priceCents: number;
  currency: "EUR";
  productionTimeDays: number;
};

type StorefrontImage = {
  id: string;
  url: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
};

export type StorefrontProductDetail = Product & {
  variants: StorefrontVariant[];
  options: StorefrontOption[];
  images: StorefrontImage[];
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapStaticProduct(product: (typeof staticProducts)[number]): Product {
  return {
    ...product,
    defaultVariantId: `${product.id}-default`,
    currency: "EUR",
    isPersonalizable: product.shopCategory !== "bundle-angebote",
    source: "static"
  };
}

function mapDetailFromProduct(product: Product): StorefrontProductDetail {
  return {
    ...product,
    variants: [
      {
        id: product.defaultVariantId ?? `${product.id}-default`,
        name: "Standard",
        sku: `${product.id.toUpperCase()}-STD`,
        priceCents: Math.round(product.price * 100),
        currency: "EUR",
        productionTimeDays: product.shopCategory === "glasuntersetzer" ? 4 : 3
      }
    ],
    images: [
      {
        id: `${product.id}-primary`,
        url: product.image,
        altText: product.name,
        sortOrder: 0,
        isPrimary: true
      },
      ...product.gallery.map((image, index) => ({
        id: `${product.id}-gallery-${index + 1}`,
        url: image,
        altText: `${product.name} ${index + 2}`,
        sortOrder: index + 1,
        isPrimary: false
      }))
    ],
    options: []
  };
}

function buildStorefrontProduct(input: {
  id: string;
  productDoc: ReturnType<typeof productDocumentSchema.parse>;
  variants: StorefrontVariant[];
  images: StorefrontImage[];
  source: "firebase" | "static";
}): Product {
  const primaryImage = input.images.find((image) => image.isPrimary) ?? input.images[0];
  const activeVariant = input.variants[0];

  return {
    id: input.id,
    name: input.productDoc.title,
    price: activeVariant.priceCents / 100,
    image: primaryImage?.url ?? "/images/glas/2er-set-weinglas-ringe-personalisiert-699d1e.jpg",
    gallery: input.images
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((image) => image.url),
    category: input.productDoc.category,
    categoryId: input.productDoc.categoryId,
    glassType: input.productDoc.glassType as Product["glassType"],
    shopCategory: input.productDoc.shopCategory as Product["shopCategory"],
    collection: input.productDoc.collection,
    collectionSlug: input.productDoc.collectionSlug as Product["collectionSlug"],
    designer: input.productDoc.designer,
    occasion: input.productDoc.occasion as Product["occasion"],
    description: input.productDoc.shortDescription,
    badge: input.productDoc.badge,
    featured: input.productDoc.featured,
    care: input.productDoc.care,
    benefits: input.productDoc.benefits,
    rating: input.productDoc.rating,
    reviews: input.productDoc.reviews,
    defaultVariantId: activeVariant.id,
    currency: activeVariant.currency,
    isPersonalizable: input.productDoc.isPersonalizable,
    slug: input.productDoc.slug || slugify(input.productDoc.title),
    source: input.source
  };
}

async function readVariants(productId: string) {
  const snapshot = await getAdminDb().collection("products").doc(productId).collection("variants").get();
  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      data: productVariantDocumentSchema.parse(doc.data())
    }))
    .filter((entry) => entry.data.isActive)
    .sort((left, right) => left.data.sortOrder - right.data.sortOrder)
    .map((entry) => ({
      id: entry.id,
      name: entry.data.name,
      sku: entry.data.sku,
      priceCents: entry.data.priceCents,
      currency: entry.data.currency,
      productionTimeDays: entry.data.productionTimeDays
    }));
}

async function readImages(productId: string) {
  const snapshot = await getAdminDb().collection("products").doc(productId).collection("images").get();
  return snapshot.docs
    .flatMap((doc) => {
      const image = normalizeLegacyProductImage(
        {
          source: "storefront",
          productId,
          imageId: doc.id
        },
        doc.data()
      );

      if (!image) {
        return [];
      }

      return [
        {
          id: doc.id,
          url: image.publicUrl ?? image.url!,
          altText: image.altText,
          sortOrder: image.sortOrder,
          isPrimary: image.isPrimary
        }
      ];
    })
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

async function readOptions(productId: string) {
  const snapshot = await getAdminDb().collection("products").doc(productId).collection("options").get();

  return Promise.all(
    snapshot.docs.map(async (doc): Promise<StorefrontOption | null> => {
      const option = productOptionDocumentSchema.parse(doc.data());
      if (!option.isActive) {
        return null;
      }

      const valueSnapshot = await doc.ref.collection("values").get();
      const values = valueSnapshot.docs
        .map((valueDoc) => ({
          id: valueDoc.id,
          data: productOptionValueDocumentSchema.parse(valueDoc.data())
        }))
        .filter((entry) => entry.data.isActive)
        .sort((left, right) => left.data.sortOrder - right.data.sortOrder)
        .map((entry) => ({
          id: entry.id,
          label: entry.data.label,
          value: entry.data.value,
          sortOrder: entry.data.sortOrder,
          priceModifierCents: entry.data.priceModifierCents ?? 0
        }));

      const mappedOption: StorefrontOption = {
        id: doc.id,
        name: option.name,
        code: option.code,
        type: option.type,
        isRequired: option.isRequired,
        helpText: option.helpText,
        placeholder: option.placeholder,
        maxLength: option.maxLength,
        priceModifierCents: option.priceModifierCents ?? 0,
        pricingMode: option.pricingMode,
        sortOrder: option.sortOrder,
        acceptedMimeTypes: option.acceptedMimeTypes,
        values
      };

      return mappedOption;
    })
  ).then((options) =>
    options
      .filter((option): option is StorefrontOption => option !== null)
      .filter((option) => valuesOrNoValuesAllowed(option))
      .sort((left, right) => left.sortOrder - right.sortOrder)
  );
}

function valuesOrNoValuesAllowed(option: StorefrontOption) {
  return option.type === "select" ? option.values.length > 0 : true;
}

async function mapProductDoc(doc: QueryDocumentSnapshot, taxonomyCatalog: ProductTaxonomyCatalog) {
  const productParse = productDocumentSchema.safeParse(doc.data());
  if (!productParse.success) {
    console.warn("[catalog] product skipped: invalid product document", {
      productId: doc.id,
      issues: productParse.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
    return null;
  }

  const productDoc = productParse.data;
  const taxonomyFields = await resolveProductTaxonomyFields(productDoc, taxonomyCatalog);
  if (!isProductVisibleInShop(productDoc.status)) {
    console.info("[catalog] product excluded from storefront", {
      productId: doc.id,
      reason: "status_not_visible",
      status: productDoc.status
    });
    return null;
  }

  const [variants, images, options] = await Promise.all([
    readVariants(doc.id),
    readImages(doc.id),
    readOptions(doc.id)
  ]);

  const publicationValidation = validateProductForPublishing({
    title: productDoc.title,
    slug: productDoc.slug,
    shortDescription: productDoc.shortDescription,
    category: taxonomyFields.category,
    shopCategory: taxonomyFields.shopCategory,
    collection: taxonomyFields.collection,
    collectionSlug: taxonomyFields.collectionSlug,
    status: productDoc.status,
    defaultVariantId: productDoc.defaultVariantId,
    variants,
    images
  });

  if (!publicationValidation.isPublishable) {
    console.info("[catalog] product excluded from storefront", {
      productId: doc.id,
      reason: "not_publishable",
      issues: publicationValidation.issues.map((issue) => issue.message)
    });
    return null;
  }

  return {
    product: buildStorefrontProduct({
      id: doc.id,
      productDoc: {
        ...productDoc,
        ...taxonomyFields
      },
      variants,
      images,
      source: "firebase"
    }),
    detail: {
      ...buildStorefrontProduct({
        id: doc.id,
        productDoc: {
          ...productDoc,
          ...taxonomyFields
        },
        variants,
        images,
        source: "firebase"
      }),
      variants,
      options,
      images
    } satisfies StorefrontProductDetail
  };
}

async function readFirebaseCatalog() {
  const snapshot = await getAdminDb().collection("products").where("status", "==", "active").get();
  const taxonomyCatalog = await getProductTaxonomyCatalog();
  const entries = (
    await Promise.all(
      snapshot.docs.map(async (doc) => {
        try {
          return await mapProductDoc(doc, taxonomyCatalog);
        } catch (error) {
          console.warn("[catalog] product skipped after unexpected storefront mapping error", {
            productId: doc.id,
            error: error instanceof Error ? error.message : "Unknown error"
          });
          return null;
        }
      })
    )
  ).filter((entry) => entry !== null);
  const storefrontEntries = entries.filter((entry) => entry.product.id !== "gu-custom");

  return {
    products: storefrontEntries.map((entry) => entry.product),
    details: Object.fromEntries(entries.map((entry) => [entry.product.id, entry.detail]))
  };
}

function readStaticCatalog() {
  const products = staticProducts.map(mapStaticProduct);
  return {
    products,
    details: Object.fromEntries(products.map((product) => [product.id, mapDetailFromProduct(product)]))
  };
}

async function loadCatalog() {
  noStore();

  if (!isFirebaseAdminConfigured()) {
    return readStaticCatalog();
  }

  try {
    return await readFirebaseCatalog();
  } catch (error) {
    console.warn("Falling back to static catalog because Firestore could not be read.", error);
    return readStaticCatalog();
  }
}

export async function getStorefrontProducts() {
  return (await loadCatalog()).products;
}

export async function getStorefrontProductById(id: string) {
  return (await loadCatalog()).details[id];
}
