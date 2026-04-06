import type { ProductStatus } from "./models";

export type PublishableVariantInput = {
  id: string;
  sku: string;
  priceCents: number;
  isActive?: boolean;
};

export type PublishableImageInput = {
  id: string;
  url?: string;
  publicUrl?: string;
  altText: string;
  isPrimary: boolean;
};

export type PublishableProductInput = {
  title: string;
  slug: string;
  shortDescription: string;
  category: string;
  shopCategory: string;
  collection: string;
  collectionSlug: string;
  status: ProductStatus;
  defaultVariantId?: string;
  variants: PublishableVariantInput[];
  images: PublishableImageInput[];
};

export type ProductPublicationIssue = {
  field:
    | "title"
    | "slug"
    | "shortDescription"
    | "category"
    | "shopCategory"
    | "collection"
    | "collectionSlug"
    | "variants"
    | "images";
  message: string;
};

export type ProductPublicationValidation = {
  isPublishable: boolean;
  issues: ProductPublicationIssue[];
};

export type ProductPublicationChecklistStatus = "complete" | "missing" | "incomplete";

export type ProductPublicationChecklistItem = {
  id:
    | "title"
    | "slug"
    | "shop-assignment"
    | "active-variant"
    | "price"
    | "images";
  label: string;
  description: string;
  sectionId: string;
  status: ProductPublicationChecklistStatus;
  detail: string;
};

export type ProductPublicationChecklist = {
  isReady: boolean;
  completedCount: number;
  totalCount: number;
  items: ProductPublicationChecklistItem[];
  validation: ProductPublicationValidation;
  extraIssues: ProductPublicationIssue[];
};

function getPreferredVariant(product: PublishableProductInput) {
  return (
    product.variants.find((variant) => variant.id === product.defaultVariantId && (variant.isActive ?? true)) ??
    product.variants.find((variant) => variant.isActive ?? true) ??
    product.variants[0]
  );
}

export function isProductVisibleInShop(status: ProductStatus) {
  return status === "active";
}

export function validateProductForPublishing(product: PublishableProductInput): ProductPublicationValidation {
  const issues: ProductPublicationIssue[] = [];
  const preferredVariant = getPreferredVariant(product);
  const activeVariants = product.variants.filter((variant) => variant.isActive ?? true);
  const validImages = product.images.filter((image) => Boolean(image.publicUrl ?? image.url));

  if (!product.title.trim()) {
    issues.push({ field: "title", message: "Titel fehlt." });
  }

  if (!product.slug.trim()) {
    issues.push({ field: "slug", message: "Slug fehlt." });
  }

  if (!product.shortDescription.trim()) {
    issues.push({ field: "shortDescription", message: "Kurzbeschreibung fehlt." });
  }

  if (!product.category.trim()) {
    issues.push({ field: "category", message: "Kategorie fehlt." });
  }

  if (!product.shopCategory.trim()) {
    issues.push({ field: "shopCategory", message: "Shop-Kategorie fehlt." });
  }

  if (!product.collection.trim()) {
    issues.push({ field: "collection", message: "Kollektion fehlt." });
  }

  if (!product.collectionSlug.trim()) {
    issues.push({ field: "collectionSlug", message: "Kollektion-Slug fehlt." });
  }

  if (activeVariants.length === 0) {
    issues.push({ field: "variants", message: "Mindestens eine aktive Variante mit Preis ist erforderlich." });
  }

  if (!preferredVariant) {
    issues.push({ field: "variants", message: "Es ist keine Standardvariante fuer die Veroeffentlichung vorhanden." });
  } else {
    if (!preferredVariant.sku.trim()) {
      issues.push({ field: "variants", message: "Die Veroeffentlichungsvariante benoetigt eine SKU." });
    }

    if (preferredVariant.priceCents <= 0) {
      issues.push({ field: "variants", message: "Die Veroeffentlichungsvariante benoetigt einen Preis groesser 0." });
    }
  }

  if (validImages.length === 0) {
    issues.push({ field: "images", message: "Mindestens ein Produktbild ist fuer den Shop erforderlich." });
  }

  if (validImages.length > 0 && !validImages.some((image) => image.isPrimary)) {
    issues.push({ field: "images", message: "Ein Primary-Bild fuer die Shop-Ausgabe fehlt." });
  }

  return {
    isPublishable: issues.length === 0,
    issues
  };
}

export function getProductPublicationErrorMessage(validation: ProductPublicationValidation) {
  return `Produkt kann nicht veroeffentlicht werden: ${validation.issues.map((issue) => issue.message).join(" ")}`;
}

export function isProductReadyForPublishing(product: PublishableProductInput) {
  return validateProductForPublishing(product).isPublishable;
}

export function getProductPublicationChecklist(product: PublishableProductInput): ProductPublicationChecklist {
  const validation = validateProductForPublishing(product);
  const activeVariants = product.variants.filter((variant) => variant.isActive ?? true);
  const preferredVariant = getPreferredVariant(product);
  const validImages = product.images.filter((image) => Boolean(image.publicUrl ?? image.url));
  const hasPrimaryImage = validImages.some((image) => image.isPrimary);
  const missingShopAssignment = [
    !product.category.trim() ? "Kategorie" : null,
    !product.shopCategory.trim() ? "Shop-Kategorie" : null,
    !product.collection.trim() ? "Kollektion" : null,
    !product.collectionSlug.trim() ? "Kollektion-Slug" : null
  ].filter((value): value is string => Boolean(value));
  const isPriceReady = Boolean(preferredVariant && preferredVariant.priceCents > 0);
  const isSkuReady = Boolean(preferredVariant?.sku.trim());

  const items: ProductPublicationChecklistItem[] = [
    {
      id: "title",
      label: "Titel",
      description: "Produktname fuer Shop und Listen",
      sectionId: "basic",
      status: product.title.trim() ? "complete" : "missing",
      detail: product.title.trim() ? "Titel vorhanden." : "Titel fehlt noch."
    },
    {
      id: "slug",
      label: "Slug",
      description: "Oeffentliche Produkt-URL",
      sectionId: "basic",
      status: product.slug.trim() ? "complete" : "missing",
      detail: product.slug.trim() ? `/${product.slug}` : "Slug fehlt noch."
    },
    {
      id: "shop-assignment",
      label: "Shop-Zuordnung",
      description: "Kategorie, Shop-Kategorie und Kollektion",
      sectionId: "categorization",
      status:
        missingShopAssignment.length === 0
          ? "complete"
          : missingShopAssignment.length === 4
            ? "missing"
            : "incomplete",
      detail:
        missingShopAssignment.length === 0
          ? "Kategorie, Shop-Kategorie und Kollektion sind gesetzt."
          : `Fehlt: ${missingShopAssignment.join(", ")}.`
    },
    {
      id: "active-variant",
      label: "Aktive Variante",
      description: "Mindestens eine kaufbare Variante",
      sectionId: "variants",
      status:
        activeVariants.length === 0
          ? "missing"
          : preferredVariant
            ? "complete"
            : "incomplete",
      detail:
        activeVariants.length === 0
          ? "Keine aktive Variante vorhanden."
          : preferredVariant
            ? `${activeVariants.length} aktive Variante(n) bereit.`
            : "Standardvariante fuer die Veroeffentlichung fehlt."
    },
    {
      id: "price",
      label: "Preis",
      description: "Preis und SKU der Veroeffentlichungsvariante",
      sectionId: "variants",
      status:
        activeVariants.length === 0
          ? "missing"
          : !isPriceReady
            ? "missing"
            : isSkuReady
              ? "complete"
              : "incomplete",
      detail:
        activeVariants.length === 0
          ? "Preis erst pruefbar, sobald eine Variante aktiv ist."
          : !isPriceReady
            ? "Preis groesser 0 fehlt."
            : isSkuReady
              ? "Preis und SKU sind vorhanden."
              : "Preis vorhanden, aber SKU fehlt noch."
    },
    {
      id: "images",
      label: "Bilder",
      description: "Mindestens ein Bild mit Primary-Markierung",
      sectionId: "media",
      status:
        validImages.length === 0
          ? "missing"
          : hasPrimaryImage
            ? "complete"
            : "incomplete",
      detail:
        validImages.length === 0
          ? "Noch kein Bild vorhanden."
          : hasPrimaryImage
            ? `${validImages.length} Bild(er) vorhanden, Primary gesetzt.`
            : `${validImages.length} Bild(er) vorhanden, aber kein Primary-Bild markiert.`
    }
  ];

  const coveredFields = new Set<ProductPublicationIssue["field"]>([
    "title",
    "slug",
    "category",
    "shopCategory",
    "collection",
    "collectionSlug",
    "variants",
    "images"
  ]);

  return {
    isReady: validation.isPublishable,
    completedCount: items.filter((item) => item.status === "complete").length,
    totalCount: items.length,
    items,
    validation,
    extraIssues: validation.issues.filter((issue) => !coveredFields.has(issue.field))
  };
}
