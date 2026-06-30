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
      <Field label="School name">
        <input name="schoolName" required placeholder="Greenfield International School" className={inputClass} />
      </Field>
      <Field label="Your name">
        <input name="name" required autoComplete="name" placeholder="Mrs. Ifeoma Okeke" className={inputClass} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" placeholder="you@school.edu.ng" className={inputClass} />
      </Field>
      <Field label="Password">
        <input name="password" type="password" required autoComplete="new-password" placeholder="At least 6 characters" className={inputClass} />
      </Field>
      <FormError message={state.error} />
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
