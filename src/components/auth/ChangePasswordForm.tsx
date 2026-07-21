"use client";

import { useActionState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/primitives";
import { changeOwnPassword, type AccountState } from "@/lib/actions/account";

const input =
  "h-10 w-full rounded-[var(--radius-card)] border border-border bg-secondary px-3 text-[13.5px] text-ink outline-none focus:border-forest-line focus:bg-card";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(changeOwnPassword, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok, state]);

  return (
    <Card>
      <form ref={ref} action={action} className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-ink-2">Current password</span>
          <input name="current" type="password" required autoComplete="current-password" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-ink-2">New password</span>
          <input name="next" type="password" required minLength={6} autoComplete="new-password" placeholder="At least 6 characters" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-ink-2">Confirm new password</span>
          <input name="confirm" type="password" required autoComplete="new-password" className={input} />
        </label>
        {state.error && <p className="rounded-[8px] bg-red-soft px-3 py-2 text-[12.5px] font-medium text-red">{state.error}</p>}
        {state.ok && <p className="rounded-[8px] bg-green-soft px-3 py-2 text-[12.5px] font-medium text-green">Password changed. Use the new one next time you sign in. ✓</p>}
        <div>
          <button disabled={pending} className="h-10 rounded-[var(--radius-card)] bg-forest px-5 text-[13.5px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
            {pending ? "Saving…" : "Change password"}
          </button>
        </div>
      </form>
    </Card>
  );
}
