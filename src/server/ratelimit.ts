import "server-only";

// DB-backed fixed-window rate limiting. Counters live in Postgres (not in
// memory) so limits are shared across app instances and survive restarts —
// keeping the app horizontally scalable. Fails OPEN on infra error so the
// limiter can never take the whole app down.

import { prisma } from "@/lib/db";

/** Increment the counter for `key`, resetting if its window elapsed. Returns the
 *  new count within the current window. Done as ONE atomic upsert so concurrent
 *  requests can't all take the "reset" branch and defeat the limit. */
export async function bumpRate(key: string, windowSec: number): Promise<number> {
  const expires = new Date(Date.now() + windowSec * 1000);
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateHit" ("key", "count", "expiresAt") VALUES (${key}, 1, ${expires})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateHit"."expiresAt" <= now() THEN 1 ELSE "RateHit"."count" + 1 END,
        "expiresAt" = CASE WHEN "RateHit"."expiresAt" <= now() THEN ${expires} ELSE "RateHit"."expiresAt" END
      RETURNING "count";`;
    return rows[0]?.count ?? 0;
  } catch (e) {
    console.error("[ratelimit] bump error", e);
    return 0; // fail open — the limiter must never take the app down
  }
}

/** Current count for `key` within its window (0 if none/expired). No increment. */
export async function peekRate(key: string): Promise<number> {
  try {
    const row = await prisma.rateHit.findUnique({ where: { key } });
    if (!row || row.expiresAt <= new Date()) return 0;
    return row.count;
  } catch {
    return 0;
  }
}

/** Reset a counter (e.g. after a successful login). */
export async function clearRate(key: string): Promise<void> {
  try {
    await prisma.rateHit.deleteMany({ where: { key } });
  } catch {
    /* ignore */
  }
}

/** Convenience for API routes: allowed if under `limit` per `windowSec`. */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<{ allowed: boolean; retryAfter: number }> {
  const n = await bumpRate(key, windowSec);
  if (n === 0) return { allowed: true, retryAfter: 0 }; // fail open
  return { allowed: n <= limit, retryAfter: n <= limit ? 0 : windowSec };
}
