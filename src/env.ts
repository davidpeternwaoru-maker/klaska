import "server-only";

// Typed, validated environment configuration — the ONE place env vars are read.
// Validated with Zod at first import on the server, so a missing/blank secret
// fails fast at boot with a clear message instead of surfacing as a random
// runtime error later. Never import this from client components or Edge
// middleware (middleware reads AUTH_SECRET directly to stay Edge-safe).

import { z } from "zod";

const schema = z.object({
  // dev / staging / prod are all just NODE_ENV=production at runtime; the
  // distinction is which DATABASE_URL / secrets the environment injects.
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Pooled Postgres URL used by the running app (Neon PgBouncer pooler).
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required").refine((u) => u.startsWith("postgres"), "DATABASE_URL must be a postgres:// connection string"),
  // Direct (unpooled) URL used only by `prisma migrate`. Optional at runtime.
  DIRECT_URL: z.string().optional(),
  // Secret used to sign session JWTs. Must be long enough to be safe.
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
  // Optional: an HTTPS endpoint to forward server errors to (Sentry-compatible
  // proxy, Logtail, etc.). When set, captureError POSTs each error there.
  MONITOR_WEBHOOK: z.string().url().optional(),
  // Optional build/version stamp surfaced by the health check.
  APP_VERSION: z.string().optional(),
  // Absolute base URL of this deployment (e.g. https://klaska-mu.vercel.app),
  // used to build payment links + the provider callback. Falls back to the
  // request's own origin when unset.
  APP_URL: z.string().url().optional(),
  // Paystack keys — optional so the app boots without them; online payments are
  // simply disabled until they're set. Use TEST keys in dev, LIVE keys in prod.
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
});

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}\n\nSee .env.example for the required variables.`);
  }
  return parsed.data;
}

export const env = load();
export const isProd = env.NODE_ENV === "production";
export const isDev = env.NODE_ENV === "development";
/** True when online payments are configured for this environment. */
export const paymentsEnabled = !!env.PAYSTACK_SECRET_KEY;
