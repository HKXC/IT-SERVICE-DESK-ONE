// Simple in-memory sliding-window rate limiter.
// For multi-instance production, swap the Map for Upstash Redis
// (env UPSTASH_REDIS_REST_URL is already scaffolded in .env.example).

const buckets = new Map<string, number[]>();

export async function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000
): Promise<{ ok: boolean; remaining: number }> {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, remaining: 0 };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, remaining: limit - hits.length };
}

export function rateLimitKey(prefix: string, id: string) {
  return `${prefix}:${id}`;
}
