"use client";

// Route-level error boundary. Shows a calm, friendly message — never a stack
// trace or internal detail. The opaque `digest` is safe to show and lets
// support correlate the incident with the server logs.

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Server errors are already captured server-side; this is the browser trace.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[520px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--radius-card)] bg-red-soft text-red">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
      </div>
      <h1 className="text-[18px] font-semibold text-ink">Something went wrong</h1>
      <p className="mt-1.5 text-[13.5px] text-ink-4">An unexpected error occurred. Your data is safe. Please try again, and if it keeps happening, contact support.</p>
      {error.digest && <p className="mt-2 text-[11.5px] text-ink-4">Reference: <span className="font-mono">{error.digest}</span></p>}
      <div className="mt-5 flex gap-2">
        <button onClick={() => reset()} className="h-10 rounded-[var(--radius-card)] bg-forest px-5 text-[13px] font-semibold text-white transition hover:bg-forest-2">Try again</button>
        <a href="/" className="flex h-10 items-center rounded-[var(--radius-card)] border border-border px-5 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">Go home</a>
      </div>
    </div>
  );
}
