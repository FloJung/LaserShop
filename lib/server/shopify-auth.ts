import "server-only";

const SHOPIFY_SHOP_DOMAIN = "laser-991863.myshopify.com";
const SHOPIFY_CLIENT_ID = "7e9736e2abd6a28588e5b7228142b921";
const SHOPIFY_API_VERSION = "2026-01";
const SHOPIFY_ACCESS_TOKEN_URL = `https://${SHOPIFY_SHOP_DOMAIN}/admin/oauth/access_token`;
const SHOPIFY_PRODUCTS_URL = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products.json`;

type ShopifyAccessTokenResponse = {
  access_token?: string;
  scope?: string;
  error?: string;
  errors?: unknown;
};

let storedShopifyAccessToken: string | null = null;

function maskToken(value: string) {
  if (value.length <= 10) {
    return "***";
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error.";
}

function getShopifyClientSecret() {
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error("SHOPIFY_CLIENT_SECRET is not configured.");
  }

  return clientSecret;
}

async function parseJsonResponse<T>(response: Response) {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function extractShopifyError(payload: ShopifyAccessTokenResponse | Record<string, unknown> | null) {
  if (!payload) {
    return "Empty response from Shopify.";
  }

  if (typeof payload.error === "string" && payload.error.length > 0) {
    return payload.error;
  }

  if ("errors" in payload && payload.errors) {
    return typeof payload.errors === "string" ? payload.errors : JSON.stringify(payload.errors);
  }

  return "Unknown Shopify error.";
}

export async function exchangeShopifyCodeForAccessToken(code: string) {
  const trimmedCode = code.trim();
  if (!trimmedCode) {
    throw new Error("Shopify authorization code is empty.");
  }

  const response = await fetch(SHOPIFY_ACCESS_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      client_id: SHOPIFY_CLIENT_ID,
      client_secret: getShopifyClientSecret(),
      code: trimmedCode
    }),
    cache: "no-store"
  });

  const payload = await parseJsonResponse<ShopifyAccessTokenResponse>(response);
  if (!response.ok) {
    throw new Error(`Shopify token exchange failed (${response.status}): ${extractShopifyError(payload)}`);
  }

  const accessToken = payload?.access_token;
  if (!accessToken) {
    throw new Error("Shopify token exchange succeeded without an access token.");
  }

  storedShopifyAccessToken = accessToken;
  console.log("[shopify] access token received via oauth:", {
    scope: payload?.scope ?? null,
    tokenPreview: maskToken(accessToken)
  });

  return {
    accessToken,
    scope: payload?.scope ?? null
  };
}

export async function testShopifyProductsRequest(accessToken: string) {
  const response = await fetch(SHOPIFY_PRODUCTS_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Shopify-Access-Token": accessToken
    },
    cache: "no-store"
  });

  const payload = await parseJsonResponse<Record<string, unknown>>(response);
  if (!response.ok) {
    throw new Error(`Shopify test API call failed (${response.status}): ${extractShopifyError(payload)}`);
  }

  console.log("[shopify] test products response:", JSON.stringify(payload, null, 2));
  return payload;
}

export function getStoredShopifyAccessToken() {
  return storedShopifyAccessToken;
}

export function getStoredShopifyShopDomain() {
  return SHOPIFY_SHOP_DOMAIN;
}

export { getErrorMessage as getShopifyErrorMessage };
