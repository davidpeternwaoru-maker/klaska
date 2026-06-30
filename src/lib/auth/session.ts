// Session cookie helpers — the *server* half of auth.
//
// These read/write the httpOnly cookie that holds the session token. httpOnly
// means JavaScript in the browser cannot read it (protects against XSS theft).
// Anything in here is Node-only (it uses next/headers), so it must NOT be
// imported by middleware — middleware uses jwt.ts directly instead.

import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signToken, verifyToken, SESSION_COOKIE, type SessionUser } from "./jwt";

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

/** Read the current user from the cookie, or null if not logged in. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
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
