import { NextResponse } from "next/server";
import { requireApiUser, ok, fail } from "@/lib/api";

// The authenticated caller's own identity — the reference example for the
// versioned API: authenticate via the shared session cookie, return the JSON
// envelope, and let `fail()` clean up any error. Mobile clients call this the
// same way the web app would.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user; // 401 envelope
  try {
    return ok({ staffId: user.staffId, schoolId: user.schoolId, role: user.role, name: user.name, email: user.email });
  } catch (e) {
    return fail(e);
  }
}
