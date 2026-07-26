import "server-only";

// Request-scoped tenant context. The Prisma client extension in db.ts calls
// `currentTenant()` on every tenant-owned query and scopes it to that school —
// so even a query that FORGOT `where: { schoolId }` cannot touch another
// school's data. Defence-in-depth on top of the explicit scoping in services.
//
// The tenant is read from the session cookie (the same signed JWT the app uses)
// and memoised per request with React `cache`, so the token is verified at most
// once per request. This is reliable inside RSC / route handlers / server
// actions — unlike AsyncLocalStorage.enterWith, whose effect does not propagate
// out of a nested `await`.

import { cache } from "react";
import { cookies } from "next/headers";
import { AsyncLocalStorage } from "node:async_hooks";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth/jwt";

/** The schoolId scoping the current request, or null before auth / off-request. */
export const currentTenant = cache(async (): Promise<string | null> => {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const user = await verifyToken(token);
    return user?.schoolId ?? null;
  } catch {
    // Called outside a request (e.g. build-time) — no cookie store, no scoping.
    return null;
  }
});

// Rare, deliberate cross-tenant escape hatch (platform-admin tooling). Uses a
// callback wrapper (als.run), so its effect DOES propagate to the work inside.
const bypassStore = new AsyncLocalStorage<boolean>();
export function isTenantBypassed(): boolean {
  return bypassStore.getStore() ?? false;
}
export function bypassTenant<T>(fn: () => T): T {
  return bypassStore.run(true, fn);
}
