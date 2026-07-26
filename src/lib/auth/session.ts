// Session cookie helpers — the *server* half of auth.
//
// These read/write the httpOnly cookie that holds the session token. httpOnly
// means JavaScript in the browser cannot read it (protects against XSS theft).
// Anything in here is Node-only (it uses next/headers), so it must NOT be
// imported by middleware — middleware uses jwt.ts directly instead.

import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { signToken, verifyToken, SESSION_COOKIE, type SessionUser } from "./jwt";

// One memoised read of the account's current token version per request. The
// token carries the version it was issued at; a mismatch (after logout or a
// password reset bumped it) means the token is revoked.
const accountTokenVersion = cache(async (staffId: string): Promise<number | null> => {
  const s = await prisma.staff.findUnique({ where: { id: staffId }, select: { tokenVersion: true } });
  return s ? s.tokenVersion : null;
});

const SEVEN_DAYS = 60 * 60 * 24 * 7;

/** Issue a session: sign a token and drop it in a secure cookie. */
export async function createSession(user: SessionUser) {
  const token = await signToken(user);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SEVEN_DAYS,
  });
}

/** Read the current user from the cookie, or null if not logged in. (The data
 *  layer resolves the tenant from the same cookie independently — see tenant.ts.) */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = await verifyToken(token);
  if (!user) return null;
  // Token invalidation: the token's version must match the account's current
  // version. Legacy tokens (no version) are treated as 0, so they stay valid
  // until someone bumps the account (logout / password reset), then are revoked.
  const current = await accountTokenVersion(user.staffId);
  if (current === null || current !== (user.tokenVersion ?? 0)) return null;
  return user;
}

/** Use at the top of a protected page: returns the user or redirects to /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Clear the session cookie (logout). */
export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
