export type GlassType =
  | "Sektgläser"
  | "Schnapsgläser"
  | "Biergläser"
  | "Trinkgläser"
  | "Glasuntersätzer"
  | "Bundle-Angebote";

export type CollectionSlug = "flo" | "andrea" | "studio";
export type ShopCategorySlug = "alle-glaeser" | "glasuntersetzer" | "bundle-angebote";

export type Occasion = "Hochzeit" | "Geburtstag" | "Jubiläum" | "Lustig" | "Elegant";

export type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  gallery: string[];
  glassType: GlassType;
  shopCategory: ShopCategorySlug;
  collection: string;
  collectionSlug: CollectionSlug;
  designer: string;
  occasion: Occasion;
  description: string;
  badge?: string;
  featured: boolean;
  care: string;
  benefits: string[];
  rating: number;
  reviews: number;
};

export type DesignerCollection = {
  slug: CollectionSlug;
  name: string;
  creator: string;
  description: string;
  image: string;
  accent: string;
};

export type ShopCategory = {
  slug: ShopCategorySlug;
  name: string;
  description: string;
};

