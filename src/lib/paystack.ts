import "server-only";

// Thin Paystack client. We never touch card data — Paystack hosts the checkout;
// we only initialize a transaction, verify one, and validate webhook signatures.
// The secret key lives in env and never reaches the browser.

import crypto from "node:crypto";
import { env } from "@/env";

const BASE = "https://api.paystack.co";

export class PaystackError extends Error {}

function secret(): string {
  const k = env.PAYSTACK_SECRET_KEY;
  if (!k) throw new PaystackError("Online payments are not configured (PAYSTACK_SECRET_KEY is unset).");
  return k;
}

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: unknown };
  if (!res.ok || body.status === false) {
    throw new PaystackError(body.message || `Paystack request failed (${res.status}).`);
  }
  return body.data as T;
}

export type InitResult = { authorization_url: string; access_code: string; reference: string };

/** Start a transaction. `amountKobo` = naira × 100. Returns the hosted checkout URL. */
export function initializeTransaction(input: { email: string; amountKobo: number; reference: string; callbackUrl: string; metadata?: Record<string, unknown> }): Promise<InitResult> {
  return call<InitResult>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      reference: input.reference,
      callback_url: input.callbackUrl,
      currency: "NGN",
      metadata: input.metadata,
    }),
  });
}

export type VerifyResult = { status: string; reference: string; amount: number; channel?: string; paid_at?: string };

/** Verify a transaction by reference (server-authoritative source of truth). */
export function verifyTransaction(reference: string): Promise<VerifyResult> {
  return call<VerifyResult>(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" });
}

/** Validate a webhook payload: HMAC-SHA512 of the RAW body keyed by the secret,
 *  compared to the `x-paystack-signature` header. Timing-safe. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !env.PAYSTACK_SECRET_KEY) return false;
  const expected = crypto.createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
