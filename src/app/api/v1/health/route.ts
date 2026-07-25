import { prisma } from "@/lib/db";
import { ok, err } from "@/lib/api";

// Liveness + DB readiness probe for load balancers / uptime monitors / mobile.
// Public (no auth). Never cached.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok({ status: "healthy", db: "up", time: new Date().toISOString() });
  } catch {
    return err("DB_UNAVAILABLE", "Database is unreachable.", 503);
  }
}
