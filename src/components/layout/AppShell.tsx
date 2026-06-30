"use client";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/** Full-width product shell: rail + sub-panel + top bar + scrolling content.
 *  No demo chrome — this is the live Klaska web dashboard.
 *  The offline engine is a singleton (lib/offline), so no provider is needed. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-auto px-8 py-7">{children}</main>
      </div>
    </div>
  );
}
