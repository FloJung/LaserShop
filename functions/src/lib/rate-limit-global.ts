import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { CallableRequest } from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import { RATE_LIMIT_ERROR_MESSAGE, assertCallableRateLimit, getRequestIpAddress } from "./rate-limit";

type GlobalCallableRateLimiter = {
  limit(request: CallableRequest<unknown>, input: { endpoint: string }): Promise<void>;
};

const globalRateLimiterCache = new Map<string, GlobalCallableRateLimiter>();

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

function buildRateLimitKey(ip: string, endpoint: string) {
  return `${ip}:${endpoint}`;
}

export function createGlobalCallableRateLimiter(input: {
  limit: number;
  window: `${number} ${"s" | "m" | "h" | "d"}`;
  fallbackWindowMs: number;
}): GlobalCallableRateLimiter {
  const cacheKey = `${input.limit}:${input.window}`;
  const cached = globalRateLimiterCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const redis = getRedisClient();
  const limiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(input.limit, input.window),
        analytics: true,
        prefix: "laser-shop:functions:ratelimit"
      })
    : null;

  const rateLimiter: GlobalCallableRateLimiter = {
    async limit(request, options) {
      const ip = getRequestIpAddress(request);
      if (limiter) {
        const result = await limiter.limit(buildRateLimitKey(ip, options.endpoint));
        if (!result.success) {
          throw new HttpsError("resource-exhausted", RATE_LIMIT_ERROR_MESSAGE);
        }
        return;
      }

      await assertCallableRateLimit(request, {
        namespace: options.endpoint,
        limit: input.limit,
        windowMs: input.fallbackWindowMs
      });
    }
  };

  globalRateLimiterCache.set(cacheKey, rateLimiter);
  return rateLimiter;
}
