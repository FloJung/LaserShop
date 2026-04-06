export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;
export const STOCK_MODES = ["unlimited", "tracked", "made_to_order"] as const;
export const PRODUCT_OPTION_TYPES = ["text", "textarea", "select", "checkbox", "file"] as const;
export const OPTION_PRICING_MODES = ["none", "fixed", "per_character"] as const;
export const PRODUCT_IMAGE_SYNC_STATUSES = ["pending", "synced", "error"] as const;
export const PRODUCT_SHOPIFY_SYNC_STATUSES = ["pending", "synced", "error"] as const;
export const PAYMENT_STATUSES = ["pending", "authorized", "paid", "partially_refunded", "refunded", "failed"] as const;
export const ORDER_STATUSES = ["draft", "placed", "confirmed", "in_progress", "fulfilled", "completed", "cancelled"] as const;
export const PRODUCTION_STATUSES = ["queued", "proof_needed", "approved", "engraving", "finishing", "ready", "shipped", "cancelled"] as const;
export const UPLOAD_REVIEW_STATUSES = ["pending_upload", "uploaded", "linked", "approved", "rejected"] as const;
export const USER_ROLES = ["customer", "admin"] as const;
export const CHECKOUT_SOURCES = ["web", "shopify"] as const;

export const STORAGE_ROOTS = {
  productImages: "products",
  pendingCustomerUploads: "customer-uploads/pending",
  linkedCustomerUploads: "customer-uploads"
} as const;

export const SHOP_PRICING_CONFIG = {
  currency: "EUR",
  freeShippingThresholdCents: 6900,
  defaultShippingCents: 490,
  taxRate: 0.19,
  pricesIncludeTax: true
} as const;

export const MAX_CART_LINE_QUANTITY = 50;
export const MAX_CUSTOMER_NOTE_LENGTH = 1_000;
export const MAX_TEXT_OPTION_LENGTH = 120;
export const MAX_TEXTAREA_OPTION_LENGTH = 2_000;
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_PRODUCT_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_PRODUCT_IMAGE_UPLOAD_COUNT = 10;
export const ALLOWED_PRODUCT_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const DEFAULT_UPLOAD_EXPIRY_HOURS = 24;

export const ALLOWED_PAYMENT_STATUS_TRANSITIONS = {
  pending: ["authorized", "paid", "failed"],
  authorized: ["paid", "failed", "refunded"],
  paid: ["partially_refunded", "refunded"],
  partially_refunded: ["refunded"],
  refunded: [],
  failed: []
} as const;

export const ALLOWED_ORDER_STATUS_TRANSITIONS = {
  draft: ["placed", "cancelled"],
  placed: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "cancelled"],
  in_progress: ["fulfilled", "cancelled"],
  fulfilled: ["completed"],
  completed: [],
  cancelled: []
} as const;

export const ALLOWED_PRODUCTION_STATUS_TRANSITIONS = {
  queued: ["proof_needed", "approved", "engraving", "cancelled"],
  proof_needed: ["approved", "cancelled"],
  approved: ["engraving", "cancelled"],
  engraving: ["finishing", "cancelled"],
  finishing: ["ready", "cancelled"],
  ready: ["shipped", "cancelled"],
  shipped: [],
  cancelled: []
} as const;
