"use server";

// Server actions = functions that run ONLY on the server but can be called
// directly from a form/component. These three power signup, login and logout.
// Because they run on the server they can safely touch the database and set
// cookies. The forms call them via React's useActionState (see the auth pages).

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "./password";
import { createSession, destroySession } from "./session";

export type AuthState = { error?: string };

/** Create a brand-new school and its first user (the OWNER), then log them in. */
export async function signupSchool(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || null; // their role at the school
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email) return { error: "Please fill in every field." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const existing = await prisma.staff.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };

  // Create the person's account first, together with an (as-yet unnamed) school
  // they own. They'll name and configure the school in the setup wizard next.
  // The nested write is one transaction — if either insert fails, neither saves.
  const school = await prisma.school.create({
    data: {
      name: "", // set in the wizard's first step
      staff: {
        create: { name, title, email, passwordHash: await hashPassword(password), role: "OWNER" },
      },
    },
    include: { staff: true },
  });

  const owner = school.staff[0];
  await createSession({ staffId: owner.id, schoolId: school.id, role: "OWNER", name: owner.name, email: owner.email, setupComplete: false });
  redirect("/onboarding"); // new schools go through setup first
}

/** Log an existing staff member in. */
export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const staff = await prisma.staff.findUnique({ where: { email }, include: { school: { select: { setupCompletedAt: true } } } });
  // Same generic message whether the email is unknown or the password is wrong,
  // so we don't reveal which emails have accounts.
  if (!staff || !(await verifyPassword(password, staff.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  await createSession({
    staffId: staff.id,
    schoolId: staff.schoolId,
    role: staff.role,
    name: staff.name,
    email: staff.email,
    setupComplete: staff.school.setupCompletedAt != null,
  });
  redirect("/"); // the full, polished app
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
