import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RATE_LIMIT_ERROR_MESSAGE, RateLimitExceededError, assertInMemoryRateLimit, getRequestIpAddress } from "@/lib/server/rate-limit";

type RateLimiterKey = {
  ip: string;
  endpoint: string;
};

type GlobalRateLimiter = {
  limit(request: Request, input: { endpoint: string }): Promise<void>;
};

declare global {
  // eslint-disable-next-line no-var
  var __laserShopGlobalRateLimiters: Map<string, GlobalRateLimiter> | undefined;
}

function getGlobalRateLimiterStore() {
  if (!globalThis.__laserShopGlobalRateLimiters) {
    globalThis.__laserShopGlobalRateLimiters = new Map<string, GlobalRateLimiter>();
  }

  return globalThis.__laserShopGlobalRateLimiters;
}

function getRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }

  return new Redis({
    url,
    token
  });
}

function buildGlobalRateLimitKey(input: RateLimiterKey) {
  return `${input.ip}:${input.endpoint}`;
}

export function createGlobalRateLimiter(input: {
  limit: number;
  window: `${number} ${"s" | "m" | "h" | "d"}`;
  fallbackWindowMs?: number;
}): GlobalRateLimiter {
  const cacheKey = `${input.limit}:${input.window}`;
  const store = getGlobalRateLimiterStore();
  const cached = store.get(cacheKey);
  if (cached) {
    return cached;
  }

  const redis = getRedisClient();
  const limiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(input.limit, input.window),
        analytics: true,
        prefix: "laser-shop:ratelimit"
      })
    : null;

  const globalRateLimiter: GlobalRateLimiter = {
    async limit(request, options) {
      const ip = getRequestIpAddress(request);
      if (limiter) {
        const result = await limiter.limit(buildGlobalRateLimitKey({ ip, endpoint: options.endpoint }));
        if (!result.success) {
          throw new RateLimitExceededError(RATE_LIMIT_ERROR_MESSAGE);
        }
        return;
      }

      assertInMemoryRateLimit(request, {
        namespace: options.endpoint,
        limit: input.limit,
        windowMs: input.fallbackWindowMs ?? 60_000
      });
    }
  };

  store.set(cacheKey, globalRateLimiter);
  return globalRateLimiter;
}
