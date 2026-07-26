// Shared helpers for the /api/v1 layer — the single, versioned HTTP API that
// native/mobile clients (and future integrations) call. It wraps the SAME
// services the web app uses, so there is one source of truth for business logic
// and tenant/permission enforcement. Responses are a consistent JSON envelope.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { ServiceError } from "@/server/context";
import { rateLimit } from "@/server/ratelimit";
import { captureError } from "@/lib/logger";
import type { SessionUser } from "@/lib/auth/jwt";

/** Per-IP rate limit for an API route. Returns a 429 response if over the limit,
 *  or null to proceed. Call at the top of every route handler. */
export async function apiRateLimit(req: Request, limit = 120, windowSec = 60): Promise<NextResponse | null> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const { allowed } = await rateLimit(`api:ip:${ip}`, limit, windowSec);
  return allowed ? null : err("RATE_LIMITED", "Too many requests. Please slow down.", 429);
}

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: { code: string; message: string } };

export function ok<T>(data: T, init?: number) {
  return NextResponse.json<ApiOk<T>>({ ok: true, data }, { status: init ?? 200 });
}
export function err(code: string, message: string, status: number) {
  return NextResponse.json<ApiErr>({ ok: false, error: { code, message } }, { status });
}

/** Map a thrown error to a clean HTTP response — never leak internals/stack. */
export function fail(e: unknown) {
  if (e instanceof ServiceError) {
    const status = e.code === "NOT_FOUND" ? 404 : e.code === "INVALID" ? 422 : 403;
    return err(e.code, e.message, status);
  }
  // Unknown/infra error: capture server-side, return a generic message (never
  // a stack trace or internal detail to the client).
  captureError(e, { scope: "api" });
  return err("INTERNAL", "Something went wrong. Please try again.", 500);
}

/** Require an authenticated session for an API route. Returns the user or a 401
 *  response — the same JWT cookie the web app uses (mobile sends it too). */
export async function requireApiUser(): Promise<SessionUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return err("UNAUTHENTICATED", "Sign in required.", 401);
  return user;
}
