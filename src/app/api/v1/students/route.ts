import { NextResponse } from "next/server";
import { requireApiUser, ok, err, fail } from "@/lib/api";
import { studentsService } from "@/server/services/students";
import { requireCan } from "@/server/context";
import { parse } from "@/lib/validation";
import { pageSchema } from "@/lib/schemas";

// Paginated students list — the reference paginated endpoint. Auth + role +
// tenant scoping all enforced server-side (via the service + data layer).
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;

  const url = new URL(req.url);
  const parsed = parse(pageSchema, { page: url.searchParams.get("page") ?? undefined, pageSize: url.searchParams.get("pageSize") ?? undefined });
  if (!parsed.ok) return err("INVALID", parsed.error, 422);

  try {
    requireCan(user, "students"); // Bursar/others without access → 403 envelope
    const data = await studentsService.listPage(user, parsed.data);
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}
