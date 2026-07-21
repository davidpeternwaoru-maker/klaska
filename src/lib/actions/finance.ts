"use server";

// Finance Server Actions (invoices + payments) — delegate to `financeService`.

import { revalidatePath } from "next/cache";
import { requireCtx, ServiceError } from "@/server/context";
import { financeService } from "@/server/services/finance";

export type FinanceState = { ok?: boolean; error?: string; created?: number };

function refreshFinance() {
  revalidatePath("/finance/fees");
  revalidatePath("/");
}

export async function generateInvoices(): Promise<FinanceState> {
  const ctx = await requireCtx();
  try {
    const created = await financeService.generateInvoices(ctx);
    refreshFinance();
    return { ok: true, created };
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    throw e;
  }
}

export async function recordPayment(_prev: FinanceState, formData: FormData): Promise<FinanceState> {
  const ctx = await requireCtx();
  try {
    await financeService.recordPayment(ctx, {
      invoiceId: String(formData.get("invoiceId") ?? ""),
      amount: Number(formData.get("amount")),
      method: String(formData.get("method") ?? "CASH"),
      reference: String(formData.get("reference") ?? ""),
    });
    refreshFinance();
    return { ok: true };
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    throw e;
  }
}

export async function deletePayment(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await financeService.deletePayment(ctx, String(formData.get("id") ?? ""));
  refreshFinance();
}
