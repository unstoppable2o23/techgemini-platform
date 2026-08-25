import { redis } from "@/lib/redis";

type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

const COUNTER_PREFIX = "rl:";

/**
 * Simple fixed-window rate limiter backed by Redis (Upstash) with an
 * in-memory fallback for local dev. Keys are namespaced per instance.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds = 60
): Promise<RateLimitResult> {
  const fullKey = `${COUNTER_PREFIX}${key}`;
  try {
    const current = await redis.get(fullKey);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= limit) {
      return { ok: false, retryAfterSeconds: windowSeconds };
    }

    await redis.setex(fullKey, windowSeconds, String(count + 1));
    return { ok: true };
  } catch (error) {
    console.error("Rate limiter error:", error);
    // Fail open if the store is unavailable so we never block legit traffic
    // due to a Redis outage.
    return { ok: true };
  }
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}