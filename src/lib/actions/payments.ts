"use server";

// Payment Server Actions. `createPaymentLink` is Owner/Bursar-only (enforced in
// the service). `startCheckout` and `reconcile` are PUBLIC (the parent has no
// login) but keyed by the unguessable reference, and rate-limited.

import { revalidatePath } from "next/cache";
import { requireCtx, ServiceError } from "@/server/context";
import { paymentsService } from "@/server/services/payments";
import { bumpRate } from "@/server/ratelimit";

export async function createPaymentLinkAction(invoiceId: string): Promise<{ ok: true; url: string; amount: number } | { ok: false; error: string }> {
  const ctx = await requireCtx();
  try {
    const { url, amount } = await paymentsService.createLink(ctx, invoiceId);
    revalidatePath("/finance/fees");
    return { ok: true, url, amount };
  } catch (e) {
    if (e instanceof ServiceError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function startCheckoutAction(reference: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  // Public: throttle so the checkout can't be spammed.
  if ((await bumpRate(`checkout:${reference}`, 300)) > 8) return { ok: false, error: "Too many attempts. Please wait a moment and try again." };
  try {
    const url = await paymentsService.startCheckout(reference);
    return { ok: true, url };
  } catch (e) {
    if (e instanceof ServiceError) return { ok: false, error: e.message };
    return { ok: false, error: "Could not start the payment. Please try again." };
  }
}

export async function reconcilePaymentAction(reference: string): Promise<{ status: string }> {
  return { status: await paymentsService.reconcileByReference(reference) };
}
