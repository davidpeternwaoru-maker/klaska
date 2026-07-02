"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

// The real, database-backed app (auth screens + /dashboard) brings its own
// chrome, so we render those routes bare. Everything else still gets the
// original prototype shell (rail + sub-panel + top bar).
const BARE_PREFIXES = ["/login", "/signup", "/dashboard", "/onboarding"];

export type ShellSchool = {
  name: string;
  shortName: string;
  logoUrl: string | null;
  session: string;
  termLabel: string;
  weeksDone: number;
  weeksTotal: number;
  termEnds: string;
} | null;

/** Full-width product shell: rail + sub-panel + top bar + scrolling content. */
export function AppShell({ school, children }: { school?: ShellSchool; children: React.ReactNode }) {
  const pathname = usePathname();
  if (BARE_PREFIXES.some((p) => pathname.startsWith(p))) return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-ink">
      <Sidebar school={school ?? null} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-auto px-8 py-7">{children}</main>
      </div>
    </div>
  );
}
