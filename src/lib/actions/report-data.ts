"use server";

// Data actions for exports that need server-fetched, role-scoped data (payroll
// = Owner/Bursar; attendance = scoped to the caller's classes). Both delegate to
// services that enforce the matrix — the export button is never the guard.

import { requireCtx, ServiceError } from "@/server/context";
import { financeService } from "@/server/services/finance";
import { attendanceService } from "@/server/services/attendance";

export async function payrollAction(): Promise<{ ok: true; data: Awaited<ReturnType<typeof financeService.payroll>> } | { ok: false; error: string }> {
  const ctx = await requireCtx();
  try {
    return { ok: true, data: await financeService.payroll(ctx) };
  } catch (e) {
    if (e instanceof ServiceError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function attendanceReportAction(): Promise<{ ok: true; data: Awaited<ReturnType<typeof attendanceService.report>> } | { ok: false; error: string }> {
  const ctx = await requireCtx();
  try {
    return { ok: true, data: await attendanceService.report(ctx) };
  } catch (e) {
    if (e instanceof ServiceError) return { ok: false, error: e.message };
    throw e;
  }
}
