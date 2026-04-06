import "server-only";

import { getStorefrontFilterOptions } from "@/lib/server/product-taxonomies";

export async function getShopFilters() {
  return getStorefrontFilterOptions();
}
