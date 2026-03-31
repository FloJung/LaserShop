import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

import { CUSTOM_COASTER_PRODUCT } from "@/lib/cart";
import { products } from "@/lib/data/products";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { toCents } from "@/shared/catalog";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function nowIso() {
  return new Date().toISOString();
}

function buildLongDescription(input: (typeof products)[number]) {
  return [input.description, `Pflege: ${input.care}`, `Vorteile: ${input.benefits.join(", ")}`].join("\n\n");
}

function buildVariantName(input: (typeof products)[number]) {
  if (input.shopCategory === "bundle-angebote") {
    return "Geschenkset";
  }

  if (input.shopCategory === "glasuntersetzer") {
    return "Standard Set";
  }

  return "Standard";
}

function buildProductionTimeDays(input: (typeof products)[number]) {
  if (input.shopCategory === "bundle-angebote") {
    return 5;
  }

  if (input.shopCategory === "glasuntersetzer") {
    return 4;
  }

  return 3;
}

function buildOptions(productId: string, shopCategory: string) {
  const timestamp = nowIso();

  if (productId === CUSTOM_COASTER_PRODUCT.id) {
    return [
      {
        id: "project_name",
        data: {
          name: "Projektname",
          code: "project_name",
          type: "text",
          isRequired: false,
          helpText: "Interner Name fuer den Entwurf oder den Anlass.",
          placeholder: "z. B. Hochzeit Anna & Max",
          maxLength: 120,
          priceModifierCents: 0,
          pricingMode: "none",
          sortOrder: 10,
          isActive: true,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        values: []
      },
      {
        id: "artwork_upload",
        data: {
          name: "Artwork Upload",
          code: "artwork_upload",
          type: "file",
          isRequired: false,
          helpText: "Optionales Referenzmotiv fuer die Gravur.",
          priceModifierCents: 990,
          pricingMode: "fixed",
          sortOrder: 20,
          isActive: true,
          acceptedMimeTypes: ["image/png", "image/jpeg", "image/svg+xml", "application/pdf"],
          createdAt: timestamp,
          updatedAt: timestamp
        },
        values: []
      },
      {
        id: "gift_wrap",
        data: {
          name: "Geschenkverpackung",
          code: "gift_wrap",
          type: "checkbox",
          isRequired: false,
          helpText: "Samtbeutel und Geschenkband.",
          priceModifierCents: 490,
          pricingMode: "fixed",
          sortOrder: 30,
          isActive: true,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        values: []
      }
    ];
  }

  if (shopCategory === "bundle-angebote") {
    return [
      {
        id: "gift_note",
        data: {
          name: "Geschenknachricht",
          code: "gift_note",
          type: "textarea",
          isRequired: false,
          helpText: "Kurzer Text fuer eine beigelegte Karte.",
          maxLength: 300,
          priceModifierCents: 0,
          pricingMode: "none",
          sortOrder: 10,
          isActive: true,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        values: []
      },
      {
        id: "gift_box",
        data: {
          name: "Premium Geschenkbox",
          code: "gift_box",
          type: "checkbox",
          isRequired: false,
          helpText: "Starre Geschenkbox fuer den Bundle-Versand.",
          priceModifierCents: 690,
          pricingMode: "fixed",
          sortOrder: 20,
          isActive: true,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        values: []
      }
    ];
  }

  return [
    {
      id: "engraving_text",
      data: {
        name: "Wunschtext",
        code: "engraving_text",
        type: "text",
        isRequired: false,
        helpText: "Name, Datum oder kurzer Gravurtext.",
        placeholder: "z. B. Sophie 2026",
        maxLength: 80,
        priceModifierCents: 0,
        pricingMode: "none",
        sortOrder: 10,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp
      },
      values: []
    },
    {
      id: "font_style",
      data: {
        name: "Schriftstil",
        code: "font_style",
        type: "select",
        isRequired: false,
        helpText: "Vorauswahl fuer die Gravur.",
        priceModifierCents: 0,
        pricingMode: "fixed",
        sortOrder: 20,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp
      },
      values: [
        {
          id: "classic",
          data: { label: "Classic", value: "classic", sortOrder: 10, priceModifierCents: 0, isActive: true }
        },
        {
          id: "script",
          data: { label: "Script", value: "script", sortOrder: 20, priceModifierCents: 200, isActive: true }
        },
        {
          id: "modern",
          data: { label: "Modern", value: "modern", sortOrder: 30, priceModifierCents: 0, isActive: true }
        }
      ]
    },
    {
      id: "gift_wrap",
      data: {
        name: "Geschenkverpackung",
        code: "gift_wrap",
        type: "checkbox",
        isRequired: false,
        helpText: "Produkt direkt geschenkfertig vorbereiten.",
        priceModifierCents: 490,
        pricingMode: "fixed",
        sortOrder: 30,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp
      },
      values: []
    },
    {
      id: "reference_upload",
      data: {
        name: "Datei Upload",
        code: "reference_upload",
        type: "file",
        isRequired: false,
        helpText: "Optionales Logo, Monogramm oder Referenzmotiv.",
        priceModifierCents: 790,
        pricingMode: "fixed",
        sortOrder: 40,
        isActive: true,
        acceptedMimeTypes: ["image/png", "image/jpeg", "image/svg+xml", "application/pdf"],
        createdAt: timestamp,
        updatedAt: timestamp
      },
      values: []
    }
  ];
}

function buildCustomEditorProduct() {
  const timestamp = nowIso();
  return {
    id: CUSTOM_COASTER_PRODUCT.id,
    product: {
      title: CUSTOM_COASTER_PRODUCT.name,
      slug: "custom-editor-coaster",
      shortDescription: "Individuell gestaltbarer Glasuntersetzer aus dem Editor.",
      longDescription: "Editor-Produkt fuer individuelle Gravurprojekte mit eigenem Design, Text und Uploads.",
      category: "custom-editor",
      shopCategory: "glasuntersetzer",
      glassType: "Glasuntersaetzer",
      collection: "Studio",
      collectionSlug: "studio",
      designer: "LaserShop",
      occasion: "Elegant",
      featured: false,
      care: "Trocken abwischen.",
      benefits: ["Freies Design", "Editor JSON", "Upload vorbereitet"],
      rating: 5,
      reviews: 0,
      status: "active",
      isPersonalizable: true,
      defaultVariantId: CUSTOM_COASTER_PRODUCT.variantId,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    variants: [
      {
        id: CUSTOM_COASTER_PRODUCT.variantId,
        data: {
          sku: "GU-CUSTOM-STD",
          name: "Editor Einzelauftrag",
          priceCents: toCents(CUSTOM_COASTER_PRODUCT.price),
          currency: "EUR",
          stockMode: "made_to_order",
          isActive: true,
          weightGrams: 280,
          productionTimeDays: 5,
          sortOrder: 10,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      }
    ],
    images: [
      {
        id: "image-1",
        data: {
          storagePath: "products/gu-custom/image-1.jpg",
          url: CUSTOM_COASTER_PRODUCT.image,
          altText: CUSTOM_COASTER_PRODUCT.name,
          sortOrder: 10,
          isPrimary: true,
          createdAt: timestamp
        }
      }
    ],
    options: buildOptions(CUSTOM_COASTER_PRODUCT.id, "glasuntersetzer")
  };
}

function buildSeedEntries() {
  const timestamp = nowIso();
  const standardEntries = products.map((product) => ({
    id: product.id,
    product: {
      title: product.name,
      slug: slugify(product.name),
      shortDescription: product.description,
      longDescription: buildLongDescription(product),
      category: product.glassType,
      shopCategory: product.shopCategory,
      glassType: product.glassType,
      collection: product.collection,
      collectionSlug: product.collectionSlug,
      designer: product.designer,
      occasion: product.occasion,
      badge: product.badge,
      featured: product.featured,
      care: product.care,
      benefits: product.benefits,
      rating: product.rating,
      reviews: product.reviews,
      status: "active",
      isPersonalizable: product.shopCategory !== "bundle-angebote",
      defaultVariantId: `${product.id}-default`,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    variants: [
      {
        id: `${product.id}-default`,
        data: {
          sku: `${product.id.toUpperCase()}-STD`,
          name: buildVariantName(product),
          priceCents: toCents(product.price),
          currency: "EUR",
          stockMode: product.shopCategory === "bundle-angebote" ? "tracked" : "made_to_order",
          stockQuantity: product.shopCategory === "bundle-angebote" ? 25 : undefined,
          isActive: true,
          weightGrams: product.shopCategory === "glasuntersetzer" ? 280 : 420,
          productionTimeDays: buildProductionTimeDays(product),
          sortOrder: 10,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      }
    ],
    images: [product.image, ...product.gallery.filter((image) => image !== product.image)].map((image, index) => ({
      id: `image-${index + 1}`,
      data: {
        storagePath: `products/${product.id}/image-${index + 1}.jpg`,
        url: image,
        altText: `${product.name} ${index === 0 ? "Primary" : `Gallery ${index}`}`,
        sortOrder: (index + 1) * 10,
        isPrimary: index === 0,
        createdAt: timestamp
      }
    })),
    options: buildOptions(product.id, product.shopCategory)
  }));

  return [...standardEntries, buildCustomEditorProduct()];
}

async function upsertSeedEntry(entry: ReturnType<typeof buildSeedEntries>[number]) {
  const db = getAdminDb();
  const productRef = db.collection("products").doc(entry.id);

  await productRef.set(entry.product);

  for (const variant of entry.variants) {
    await productRef.collection("variants").doc(variant.id).set(variant.data);
  }

  for (const image of entry.images) {
    await productRef.collection("images").doc(image.id).set(image.data);
  }

  for (const option of entry.options) {
    const optionRef = productRef.collection("options").doc(option.id);
    await optionRef.set(option.data);

    for (const value of option.values) {
      await optionRef.collection("values").doc(value.id).set(value.data);
    }
  }
}

async function main() {
  if (!isFirebaseAdminConfigured()) {
    throw new Error("Firebase admin environment is missing. Fill FIREBASE_* variables first.");
  }

  const entries = buildSeedEntries();
  for (const entry of entries) {
    await upsertSeedEntry(entry);
    console.log(`Seeded product ${entry.id}`);
  }

  console.log(`Finished seeding ${entries.length} catalog products.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
