"use server";

// Attendance Server Action — delegates to `attendanceService.save`, revalidates.

import { revalidatePath } from "next/cache";
import { requireCtx, ServiceError } from "@/server/context";
import { attendanceService } from "@/server/services/attendance";
import type { SaveAttendanceResult } from "@/lib/attendance";

export async function saveAttendance(
  classId: string,
  dateStr: string,
  entries: { studentId: string; status: string }[],
): Promise<SaveAttendanceResult> {
  const ctx = await requireCtx();
  try {
    const saved = await attendanceService.save(ctx, classId, dateStr, entries);
    revalidatePath("/dashboard/attendance");
    revalidatePath("/people/attendance");
    revalidatePath("/");
    revalidatePath("/dashboard");
    return { ok: true, saved };
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    throw e;
  }
}
