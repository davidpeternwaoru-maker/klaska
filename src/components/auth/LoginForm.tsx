"use client";

// The login form. useActionState wires the form to the `login` server action:
// on submit it runs on the server, and if the credentials are wrong it returns
// { error } which we show. On success the action redirects to /dashboard.

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthState } from "@/lib/auth/actions";
import { Field, FormError, SubmitButton, inputClass } from "./AuthForm";

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" placeholder="you@school.edu.ng" className={inputClass} />
      </Field>
      <Field label="Password">
        <input name="password" type="password" required autoComplete="current-password" placeholder="••••••••" className={inputClass} />
      </Field>
      <FormError message={state.error} />
      <SubmitButton pending={pending}>Sign in</SubmitButton>
      <p className="text-center text-[12.5px] text-ink-4">
        New school?{" "}
        <Link href="/signup" className="font-medium text-forest hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
