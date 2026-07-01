"use client";

// Signup form — registers a new school and its first OWNER account in one step.

import { useActionState } from "react";
import Link from "next/link";
import { signupSchool, type AuthState } from "@/lib/auth/actions";
import { Field, FormError, SubmitButton, inputClass } from "./AuthForm";

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signupSchool, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="School / organization name">
        <input name="schoolName" required placeholder="Greenfield International School" className={inputClass} />
      </Field>
      <Field label="Your full name">
        <input name="name" required autoComplete="name" placeholder="Mrs. Ifeoma Okeke" className={inputClass} />
      </Field>
      <Field label="Your role at the school">
        <input name="title" required placeholder="e.g. Proprietor, Principal, Administrator" className={inputClass} list="role-suggestions" />
        <datalist id="role-suggestions">
          <option value="Proprietor" />
          <option value="Principal" />
          <option value="Head Administrator" />
          <option value="Director" />
          <option value="Head Teacher" />
        </datalist>
      </Field>
      <Field label="Organization email">
        <input name="email" type="email" required autoComplete="email" placeholder="admin@school.edu.ng" className={inputClass} />
      </Field>
      <Field label="Password">
        <input name="password" type="password" required autoComplete="new-password" placeholder="At least 6 characters" className={inputClass} />
      </Field>
      <FormError message={state.error} />
      <p className="text-[11.5px] leading-snug text-ink-4">
        You&apos;ll be the school&apos;s <b className="text-ink-3">main administrator</b> with full access. You can add other staff and set their roles once you&apos;re in.
      </p>
      <SubmitButton pending={pending}>Create school account</SubmitButton>
      <p className="text-center text-[12.5px] text-ink-4">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-forest hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
