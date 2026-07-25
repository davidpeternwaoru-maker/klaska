// Shared helpers for the /api/v1 layer — the single, versioned HTTP API that
// native/mobile clients (and future integrations) call. It wraps the SAME
// services the web app uses, so there is one source of truth for business logic
// and tenant/permission enforcement. Responses are a consistent JSON envelope.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { ServiceError } from "@/server/context";
import type { SessionUser } from "@/lib/auth/jwt";

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
  // Unknown/infra error: log server-side, return a generic message.
  console.error("[api] unhandled error:", e);
  return err("INTERNAL", "Something went wrong. Please try again.", 500);
}

/** Require an authenticated session for an API route. Returns the user or a 401
 *  response — the same JWT cookie the web app uses (mobile sends it too). */
export async function requireApiUser(): Promise<SessionUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return err("UNAUTHENTICATED", "Sign in required.", 401);
  return user;
}
