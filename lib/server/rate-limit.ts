import "server-only";

export const RATE_LIMIT_ERROR_MESSAGE = "Too many requests. Please try again later.";

type InMemoryRateLimitEntry = {
  count: number;
  resetAt: number;
};

type InMemoryRateLimitStore = Map<string, InMemoryRateLimitEntry>;

declare global {
  // eslint-disable-next-line no-var
  var __laserShopRateLimitStore: InMemoryRateLimitStore | undefined;
}

export class RateLimitExceededError extends Error {
  readonly status = 429;

  constructor(message = RATE_LIMIT_ERROR_MESSAGE) {
    super(message);
    this.name = "RateLimitExceededError";
  }
}

function getRateLimitStore() {
  if (!globalThis.__laserShopRateLimitStore) {
    globalThis.__laserShopRateLimitStore = new Map<string, InMemoryRateLimitEntry>();
  }

  return globalThis.__laserShopRateLimitStore;
}

function getRequestHeader(request: Request, name: string) {
  const value = request.headers.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function getRequestIpAddress(request: Request) {
  const forwardedFor = getRequestHeader(request, "x-forwarded-for");
  if (forwardedFor) {
    const firstHop = forwardedFor
      .split(",")
      .map((entry) => entry.trim())
      .find(Boolean);
    if (firstHop) {
      return firstHop;
    }
  }

  const fallbackHeaders = ["cf-connecting-ip", "x-real-ip", "fly-client-ip"];
  for (const headerName of fallbackHeaders) {
    const value = getRequestHeader(request, headerName);
    if (value) {
      return value;
    }
  }

  return "unknown";
}

function pruneExpiredEntries(store: InMemoryRateLimitStore, now: number) {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function assertInMemoryRateLimit(
  request: Request,
  input: {
    namespace: string;
    limit: number;
    windowMs: number;
    userId?: string | null;
  }
) {
  const now = Date.now();
  const store = getRateLimitStore();
  pruneExpiredEntries(store, now);

  const identityBase = getRequestIpAddress(request);
  const identity = input.userId?.trim() ? `${identityBase}:${input.userId.trim()}` : identityBase;
  const key = `${input.namespace}:${identity}`;
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + input.windowMs
    });
    return;
  }

  if (entry.count >= input.limit) {
    throw new RateLimitExceededError();
  }

  store.set(key, {
    ...entry,
    count: entry.count + 1
  });
}
