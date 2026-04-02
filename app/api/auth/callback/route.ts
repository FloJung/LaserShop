import { NextRequest, NextResponse } from "next/server";
import {
  exchangeShopifyCodeForAccessToken,
  getShopifyErrorMessage,
  testShopifyProductsRequest
} from "@/lib/server/shopify-auth";

const TEXT_RESPONSE_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8"
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return new NextResponse("Fehler: Shopify code fehlt in der Anfrage.", {
      status: 400,
      headers: TEXT_RESPONSE_HEADERS
    });
  }

  try {
    const { accessToken } = await exchangeShopifyCodeForAccessToken(code);
    await testShopifyProductsRequest(accessToken);

    return new NextResponse("Shopify Verbindung erfolgreich hergestellt", {
      status: 200,
      headers: TEXT_RESPONSE_HEADERS
    });
  } catch (error) {
    console.error("[shopify] oauth callback failed:", error);

    return new NextResponse(`Fehler bei der Shopify Verbindung: ${getShopifyErrorMessage(error)}`, {
      status: 500,
      headers: TEXT_RESPONSE_HEADERS
    });
  }
}
