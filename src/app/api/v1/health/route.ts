import { prisma } from "@/lib/db";
import { ok, err, apiRateLimit } from "@/lib/api";
import { env } from "@/env";

// Liveness + DB readiness probe for load balancers / uptime monitors / mobile.
// Public (no auth). Never cached.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = await apiRateLimit(req, 240, 60);
  if (limited) return limited;
  const base = { version: env.APP_VERSION ?? "dev", env: env.NODE_ENV, uptimeSec: Math.round(process.uptime()), time: new Date().toISOString() };
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok({ status: "healthy", db: "up", ...base });
  } catch {
    return err("DB_UNAVAILABLE", "Database is unreachable.", 503);
  }
}
