// Session token helpers — the *stateless* half of auth.
//
// When someone logs in we hand their browser a signed token (a JWT) describing
// who they are. The token is signed with AUTH_SECRET, so it cannot be forged or
// edited. On each request we verify that signature to trust the contents.
//
// This file uses only `jose`, which runs in BOTH the Node server and the Edge
// middleware — so the same verify logic guards pages and API routes. (We keep
// anything Node-only, like cookies() and bcrypt, out of here on purpose.)

import { SignJWT, jwtVerify } from "jose";

export type Role = "OWNER" | "HOS" | "BURSAR" | "HOD" | "TEACHER" | "ADMIN";

/** What we store inside the session token (kept small — no secrets). */
export type SessionUser = {
  staffId: string;
  schoolId: string;
  role: Role;
  name: string;
  email: string;
  /** Has this school finished the onboarding wizard? Drives the setup gate. */
  setupComplete: boolean;
  /** Matched against Staff.tokenVersion on the server; a bump (logout / password
   *  reset) invalidates every token issued before it. Absent on legacy tokens. */
  tokenVersion?: number;
};

export const SESSION_COOKIE = "klaska_session";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set — add it to your .env file.");
  return new TextEncoder().encode(secret);
}

/** Create a signed session token that expires in 7 days. */
export async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

/** Verify a token's signature & expiry. Returns the user, or null if invalid. */
export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      staffId: String(payload.staffId),
      schoolId: String(payload.schoolId),
      role: payload.role as Role,
      name: String(payload.name),
      email: String(payload.email),
      // Tokens minted before this field existed are treated as complete, so
      // already-signed-in users are never wrongly trapped in the wizard.
      setupComplete: payload.setupComplete === undefined ? true : Boolean(payload.setupComplete),
      tokenVersion: payload.tokenVersion === undefined ? undefined : Number(payload.tokenVersion),
    };
  } catch {
    return null; // bad signature, expired, or malformed
  }
}
