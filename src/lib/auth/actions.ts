"use server";

// Server actions = functions that run ONLY on the server but can be called
// directly from a form/component. These power signup, login and logout.
// Auth endpoints are rate-limited + brute-force-locked and every attempt is
// audited. Sessions carry the account's token version so logout / password
// reset can invalidate them.

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { parseForm } from "@/lib/validation";
import { loginSchema, signupSchema } from "@/lib/schemas";
import { logAudit, clientIp } from "@/server/services/audit";
import { peekRate, bumpRate, clearRate } from "@/server/ratelimit";
import { hashPassword, verifyPassword } from "./password";
import { createSession, destroySession, getCurrentUser } from "./session";

export type AuthState = { error?: string };

// Brute-force thresholds (per rolling window).
const MAX_FAILS_PER_EMAIL = 8; // lock an account after 8 bad tries / 15 min
const MAX_FAILS_PER_IP = 25; // lock an IP after 25 bad tries / 15 min
const FAIL_WINDOW = 15 * 60;

/** Create a brand-new school and its first user (the OWNER), then log them in. */
export async function signupSchool(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = parseForm(signupSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const { name, title, email, password } = parsed.data;

  const ip = await clientIp();
  const { allowed } = await rateOk(`signup:ip:${ip}`, 10, 60 * 60);
  if (!allowed) return { error: "Too many sign-up attempts. Please try again later." };

  const existing = await prisma.staff.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };

  const school = await prisma.school.create({
    data: {
      name: "", // set in the wizard's first step
      staff: { create: { name, title: title ?? null, email, passwordHash: await hashPassword(password), role: "OWNER" } },
    },
    include: { staff: true },
  });

  const owner = school.staff[0];
  await logAudit({ action: "SIGNUP", schoolId: school.id, actorId: owner.id, actorEmail: owner.email, ip });
  await createSession({ staffId: owner.id, schoolId: school.id, role: "OWNER", name: owner.name, email: owner.email, setupComplete: false, tokenVersion: owner.tokenVersion });
  redirect("/onboarding"); // new schools go through setup first
}

/** Log an existing staff member in. */
export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const { email, password } = parsed.data;
  const ip = await clientIp();
  const ipKey = `login:ip:${ip}`;
  const emailKey = `login:email:${email}`;

  // Brute-force lockout: refuse before even checking the password.
  if ((await peekRate(emailKey)) >= MAX_FAILS_PER_EMAIL || (await peekRate(ipKey)) >= MAX_FAILS_PER_IP) {
    await logAudit({ action: "LOGIN_FAILED", actorEmail: email, ip, meta: { reason: "rate_limited" } });
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const staff = await prisma.staff.findUnique({ where: { email }, include: { school: { select: { setupCompletedAt: true } } } });
  // Same generic message whether the email is unknown or the password is wrong,
  // so we don't reveal which emails have accounts.
  if (!staff || !(await verifyPassword(password, staff.passwordHash))) {
    await bumpRate(emailKey, FAIL_WINDOW);
    await bumpRate(ipKey, FAIL_WINDOW);
    await logAudit({ action: "LOGIN_FAILED", actorEmail: email, ip });
    return { error: "Invalid email or password." };
  }

  await clearRate(emailKey); // a good login clears the account's failure streak
  await logAudit({ action: "LOGIN", schoolId: staff.schoolId, actorId: staff.id, actorEmail: staff.email, ip });
  await createSession({
    staffId: staff.id,
    schoolId: staff.schoolId,
    role: staff.role,
    name: staff.name,
    email: staff.email,
    setupComplete: staff.school.setupCompletedAt != null,
    tokenVersion: staff.tokenVersion,
  });
  redirect("/"); // the full, polished app
}

export async function logout() {
  const user = await getCurrentUser();
  if (user) {
    // Invalidate every token issued for this account (this device and others).
    await prisma.staff.update({ where: { id: user.staffId }, data: { tokenVersion: { increment: 1 } } });
    await logAudit({ action: "LOGOUT", schoolId: user.schoolId, actorId: user.staffId, actorEmail: user.email });
  }
  await destroySession();
  redirect("/login");
}

async function rateOk(key: string, limit: number, windowSec: number): Promise<{ allowed: boolean }> {
  const n = await bumpRate(key, windowSec);
  return { allowed: n === 0 || n <= limit };
}
