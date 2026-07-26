import "server-only";

// Audit logging — an append-only record of important actions (who / what / when
// / from where) for accountability. Writes must never break the caller, so a
// logging failure is swallowed (and reported to the server console).

import { prisma } from "@/lib/db";
import { headers } from "next/headers";

export type AuditAction =
  | "LOGIN"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "SIGNUP"
  | "STAFF_CREATE"
  | "STAFF_REMOVE"
  | "PASSWORD_RESET"
  | "FEE_PAYMENT"
  | "DATA_EXPORT";

/** Best-effort client IP from proxy headers (works behind any host's LB). */
export async function clientIp(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  } catch {
    return null;
  }
}

export async function logAudit(input: {
  action: AuditAction;
  schoolId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  target?: string | null;
  meta?: Record<string, unknown>;
  ip?: string | null;
}): Promise<void> {
  try {
    const ip = input.ip ?? (await clientIp());
    await prisma.auditLog.create({
      data: {
        action: input.action,
        schoolId: input.schoolId ?? null,
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        target: input.target ?? null,
        ip,
        meta: input.meta as object | undefined,
      },
    });
  } catch (e) {
    console.error("[audit] failed to write", input.action, e);
  }
}
