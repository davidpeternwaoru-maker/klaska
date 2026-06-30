import "server-only";
import type { Role, SessionUser } from "./jwt";

// Centralised role checks. Using these (instead of scattered `if (role === …)`)
// means permission rules are consistent and easy to audit in one place.

export function hasRole(user: SessionUser, ...roles: Role[]): boolean {
  return roles.includes(user.role);
}

/** Throwable guard for server actions. Returns null if allowed, or an error
 *  object you can return straight from an action's { error } state. */
export function denyUnless(user: SessionUser, ...roles: Role[]): { error: string } | null {
  return roles.includes(user.role) ? null : { error: "You don't have permission to do that." };
}

export const CAN_MANAGE_STAFF: Role[] = ["OWNER", "BURSAR"];
export const CAN_MANAGE_SCHOOL: Role[] = ["OWNER"];
