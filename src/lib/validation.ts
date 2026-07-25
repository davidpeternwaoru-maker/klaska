// Input validation helpers built on Zod. Every action / API endpoint should
// parse untrusted input through a schema BEFORE it reaches a service, so bad
// input is rejected at the boundary with a clean message (never a DB error).

import { z } from "zod";

export type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

/** Validate an arbitrary value against a schema. Returns typed data or a
 *  single friendly message (the first issue). */
export function parse<S extends z.ZodType>(schema: S, input: unknown): Parsed<z.infer<S>> {
  const r = schema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, error: r.error.issues[0]?.message ?? "Invalid input." };
}

/** Validate a FormData submission (server actions bound to <form>). */
export function parseForm<S extends z.ZodType>(schema: S, formData: FormData): Parsed<z.infer<S>> {
  return parse(schema, Object.fromEntries(formData.entries()));
}
