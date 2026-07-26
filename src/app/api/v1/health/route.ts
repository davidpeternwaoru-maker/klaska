import { prisma } from "@/lib/db";
import { ok, err, apiRateLimit } from "@/lib/api";

// Liveness + DB readiness probe for load balancers / uptime monitors / mobile.
// Public (no auth). Never cached.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = await apiRateLimit(req, 240, 60);
  if (limited) return limited;
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok({ status: "healthy", db: "up", time: new Date().toISOString() });
  } catch {
    return err("DB_UNAVAILABLE", "Database is unreachable.", 503);
  }
}
