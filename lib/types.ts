export type GlassType = string;
export type CollectionSlug = string;
export type ShopCategorySlug = string;
export type Occasion = string;
export type TaxonomySlug = string;

export type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  gallery: string[];
  category?: string;
  categoryId?: string;
  glassType: GlassType;
  glassTypeId?: string;
  shopCategory: ShopCategorySlug;
  shopCategoryId?: string;
  collection: string;
  collectionId?: string;
  collectionSlug: CollectionSlug;
  designer: string;
  designerId?: string;
  occasion: Occasion;
  occasionId?: string;
  description: string;
  badge?: string;
  featured: boolean;
  care: string;
  benefits: string[];
  rating: number;
  reviews: number;
  defaultVariantId?: string;
  currency?: "EUR";
  isPersonalizable?: boolean;
  slug?: string;
  source?: "static" | "firebase";
};

export type DesignerCollection = {
  id?: string;
  slug: CollectionSlug;
  name: string;
  creator: string;
  description: string;
  image: string;
  accent: string;
  productCount?: number;
};

export type ShopCategory = {
  id?: string;
  slug: ShopCategorySlug;
  name: string;
  description: string;
};

export type TaxonomyOption = {
  id?: string;
  slug: TaxonomySlug;
  name: string;
  description?: string;
};
