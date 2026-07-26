"use client";

import { useState } from "react";
import { startCheckoutAction } from "@/lib/actions/payments";

const naira = (n: number) => "₦" + n.toLocaleString("en-NG");

export function PayButton({ reference, amount }: { reference: string; amount: number }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setErr(null);
    const r = await startCheckoutAction(reference);
    if (r.ok) {
      window.location.href = r.url; // hand off to Paystack's hosted checkout
    } else {
      setErr(r.error);
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={pay}
        disabled={busy}
        className="h-12 w-full rounded-[var(--radius-card)] bg-forest text-[14px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60"
      >
        {busy ? "Starting secure checkout…" : `Pay ${naira(amount)}`}
      </button>
      {err && <p className="mt-2 text-center text-[12.5px] font-medium text-red">{err}</p>}
    </>
  );
}
