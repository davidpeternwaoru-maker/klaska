"use server";

// Financial-statements action. Re-derives the session server-side and delegates
// to getFinancialStatements, which enforces the "financial" matrix (Owner/Bursar).

import { requireCtx, ServiceError } from "@/server/context";
import { getFinancialStatements, type Period, type FinancialStatements } from "@/server/services/statements";

export async function financialStatementsAction(
  period: Period,
): Promise<{ ok: true; data: FinancialStatements } | { ok: false; error: string }> {
  const ctx = await requireCtx();
  try {
    return { ok: true, data: await getFinancialStatements(ctx, period) };
  } catch (e) {
    if (e instanceof ServiceError) return { ok: false, error: e.message };
    throw e;
  }
}
