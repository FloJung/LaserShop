import { NextResponse } from "next/server";
import { getShopFilters } from "@/lib/server/shop-filters";

export async function GET() {
  const filters = await getShopFilters();
  return NextResponse.json(filters);
}
