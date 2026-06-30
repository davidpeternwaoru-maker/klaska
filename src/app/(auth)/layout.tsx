// Layout for the auth screens. A route group "(auth)" groups /login and /signup
// without adding "/auth" to the URL. This centered, branded card is shown
// instead of the app sidebar (AppShell renders these routes bare).

import type { ReactNode } from "react";
import { KLogo } from "@/components/ui/Icon";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-forest">
            <KLogo size={26} white />
          </span>
          <span className="font-display text-[22px] font-bold tracking-tight text-ink">Klaska</span>
        </div>
        <div className="rounded-[16px] border border-border bg-card p-7 shadow-[0_1px_2px_rgba(20,20,18,0.04),0_6px_16px_-8px_rgba(20,20,18,0.12)]">
          {children}
        </div>
        <p className="mt-5 text-center text-[12px] text-ink-4">School operating system · Nigeria</p>
      </div>
    </div>
  );
}
