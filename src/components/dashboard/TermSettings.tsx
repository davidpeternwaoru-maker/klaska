"use client";

// Session & term editor — the school states which term they're in (defaults
// come from the Nigerian academic calendar) and optionally the term dates,
// which drive the sidebar's term-progress bar.

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/primitives";
import { saveTermInfo } from "@/lib/actions/onboarding";
import { TERM_KEYS, TERM_LABEL, detectTerm, type TermKey } from "@/lib/terms";

const input =
  "h-10 w-full rounded-[10px] border border-border bg-secondary px-3 text-[13.5px] text-ink outline-none focus:border-forest-line focus:bg-card";

export function TermSettings({
  initial,
  onDone,
}: {
  initial: { session: string | null; term: string | null; termStart: string | null; termEnd: string | null };
  onDone: () => void;
}) {
  const detected = detectTerm();
  const [session, setSession] = useState(initial.session ?? detected.session);
  const [term, setTerm] = useState<TermKey>((initial.term as TermKey) ?? detected.term);
  const [termStart, setTermStart] = useState(initial.termStart ?? detected.termStart.toISOString().slice(0, 10));
  const [termEnd, setTermEnd] = useState(initial.termEnd ?? detected.termEnd.toISOString().slice(0, 10));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = () =>
    start(async () => {
      setError(null);
      const res = await saveTermInfo({ session, term, termStart, termEnd });
      if (res.ok) onDone();
      else setError(res.error ?? "Could not save.");
    });

  const useDetected = () => {
    setSession(detected.session);
    setTerm(detected.term);
    setTermStart(detected.termStart.toISOString().slice(0, 10));
    setTermEnd(detected.termEnd.toISOString().slice(0, 10));
  };

  return (
    <Card>
      <div className="mb-1 text-[15px] font-semibold text-ink">Academic session & term</div>
      <div className="mb-4 text-[12.5px] text-ink-4">
        Nigerian calendar: First Term (Sept–Dec), Second Term (Jan–Apr), Third Term (Apr–Jul). This shows across the app and on report cards.
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Session</span>
          <input className={input} value={session} onChange={(e) => setSession(e.target.value)} placeholder="2025/2026" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Current term</span>
          <select className={input} value={term} onChange={(e) => setTerm(e.target.value as TermKey)}>
            {TERM_KEYS.map((k) => (
              <option key={k} value={k}>{TERM_LABEL[k]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Term begins</span>
          <input type="date" className={input} value={termStart} onChange={(e) => setTermStart(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Term ends</span>
          <input type="date" className={input} value={termEnd} onChange={(e) => setTermEnd(e.target.value)} />
        </label>
      </div>

      {error && <p className="mt-3 text-[12.5px] font-medium text-red">{error}</p>}

      <div className="mt-5 flex items-center justify-between">
        <button onClick={useDetected} className="text-[12.5px] font-medium text-forest hover:underline">
          Use today&apos;s Nigerian calendar ({TERM_LABEL[detected.term]} · {detected.session})
        </button>
        <button onClick={save} disabled={pending} className="h-10 rounded-[10px] bg-forest px-5 text-[13.5px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </Card>
  );
}
