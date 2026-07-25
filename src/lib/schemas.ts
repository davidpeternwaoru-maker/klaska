// Shared Zod schemas — the typed contract for untrusted input. Used by server
// actions today and by the /api/v1 layer (mobile) so web and native validate
// identically. Keep field-level rules here, not scattered through services.

import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.");
// Login: don't reveal the password policy — just require something.
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

// Signup / new-account passwords: enforce a minimum strength.
export const newPasswordSchema = z.string().min(8, "Password must be at least 8 characters.");
export const signupSchema = z.object({
  name: z.string().trim().min(1, "Please fill in every field."),
  title: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  email: emailSchema,
  password: newPasswordSchema,
});

// ── Academics ───────────────────────────────────────────────────────────────
const scoreCell = z.union([z.string(), z.number(), z.null(), z.undefined()]);
export const saveResultsSchema = z.object({
  subjectId: z.string().min(1, "Pick a subject."),
  classId: z.string().min(1, "Pick a class."),
  entries: z
    .array(
      z.object({
        studentId: z.string().min(1),
        ca1: scoreCell,
        ca2: scoreCell,
        exam: scoreCell,
        subjectRemark: z.string().max(500).optional().or(z.null()).or(z.undefined()),
      }),
    )
    .max(500, "Too many rows in one save."),
});

// ── Common ────────────────────────────────────────────────────────────────
export const idSchema = z.string().min(1, "Missing identifier.");
// Pagination for any list endpoint.
export const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
export type PageInput = z.infer<typeof pageSchema>;
