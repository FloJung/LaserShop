import "server-only";

import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { unstable_noStore as noStore } from "next/cache";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { products as staticProducts } from "@/lib/data/products";
import type { Product } from "@/lib/types";
import {
  productDocumentSchema,
  productImageDocumentSchema,
  productOptionDocumentSchema,
  productOptionValueDocumentSchema,
  productVariantDocumentSchema
} from "@/shared/catalog";

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

export type StorefrontOptionValue = {
  id: string;
  label: string;
  value: string;
  sortOrder: number;
  priceModifierCents: number;
};

export type StorefrontOption = {
  id: string;
  name: string;
  code: string;
  type: "text" | "textarea" | "select" | "checkbox" | "file";
  isRequired: boolean;
  helpText?: string;
  maxLength?: number;
  priceModifierCents: number;
  pricingMode: "none" | "fixed" | "per_character";
  sortOrder: number;
  values: StorefrontOptionValue[];
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
    .map((doc) => ({
      id: doc.id,
      data: productImageDocumentSchema.parse(doc.data())
    }))
    .sort((left, right) => left.data.sortOrder - right.data.sortOrder)
    .map((entry) => ({
      id: entry.id,
      url: entry.data.url,
      altText: entry.data.altText,
      sortOrder: entry.data.sortOrder,
      isPrimary: entry.data.isPrimary
    }));
}

async function readOptions(productId: string) {
  const snapshot = await getAdminDb().collection("products").doc(productId).collection("options").get();

  return Promise.all(
    snapshot.docs.map(async (doc) => {
      const option = productOptionDocumentSchema.parse(doc.data());
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

      return {
        id: doc.id,
        name: option.name,
        code: option.code,
        type: option.type,
        isRequired: option.isRequired,
        helpText: option.helpText,
        maxLength: option.maxLength,
        priceModifierCents: option.priceModifierCents ?? 0,
        pricingMode: option.pricingMode,
        sortOrder: option.sortOrder,
        values
      } satisfies StorefrontOption;
    })
  ).then((options) => options.filter((option) => valuesOrNoValuesAllowed(option)).sort((left, right) => left.sortOrder - right.sortOrder));
}

function valuesOrNoValuesAllowed(option: StorefrontOption) {
  return option.type === "select" ? option.values.length > 0 : true;
}

async function mapProductDoc(doc: QueryDocumentSnapshot) {
  const productDoc = productDocumentSchema.parse(doc.data());
  if (productDoc.status !== "active") {
    return null;
  }

  const [variants, images, options] = await Promise.all([
    readVariants(doc.id),
    readImages(doc.id),
    readOptions(doc.id)
  ]);

  if (variants.length === 0) {
    return null;
  }

  return {
    product: buildStorefrontProduct({
      id: doc.id,
      productDoc,
      variants,
      images,
      source: "firebase"
    }),
    detail: {
      ...buildStorefrontProduct({
        id: doc.id,
        productDoc,
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
  const entries = (await Promise.all(snapshot.docs.map(mapProductDoc))).filter((entry) => entry !== null);
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
