"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SyncIndicator } from "./SyncIndicator";
import { SCHOOL } from "@/data/overview";
import { logout } from "@/lib/auth/actions";

export type TopBarUser = { name: string; roleLabel: string; schoolShort: string } | null;

function initials(name: string) {
  return name
    .replace(/^(Mrs|Mr|Ms|Miss|Dr|Chief|Engr|Prof)\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

export function TopBar({ user }: { user?: TopBarUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const name = user?.name ?? SCHOOL.principal;
  const subtitle = user ? `${user.roleLabel} · ${user.schoolShort}` : `Principal · ${SCHOOL.shortName}`;

  return (
    <header className="flex h-14 flex-none items-center justify-between border-b border-border bg-background/70 px-6 backdrop-blur-xl">
      <div className="relative w-full max-w-[440px]">
        <Icon name="search" size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-ink-4)" }} />
        <input
          placeholder="Search students, classes, payments…"
          className="h-9 w-full rounded-[10px] border border-transparent bg-secondary pl-9 pr-3 text-[13px] text-ink outline-none transition placeholder:text-ink-4 focus:border-forest-line focus:bg-card focus:shadow-[var(--ring-focus)]"
        />
      </div>

      <div className="flex items-center gap-3">
        <SyncIndicator />
        <Link
          href="/settings/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-[10px] text-ink-3 transition hover:bg-secondary"
          title="Notifications"
        >
          <Icon name="bell" size={16} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-background bg-amber" />
        </Link>
        <div className="h-6 w-px bg-border" />

        {/* user chip + menu (real account when logged in) */}
        <div ref={ref} className="relative">
          <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 rounded-[10px] py-1 pl-1 pr-2 transition hover:bg-secondary">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-soft font-display text-[12px] font-semibold text-forest">
              {initials(name)}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block max-w-[160px] truncate text-[13px] font-semibold text-ink">{name}</span>
              <span className="block text-[11px] text-ink-4">{subtitle}</span>
            </span>
            <Icon name="chevD" size={14} style={{ color: "var(--color-ink-4)" }} />
          </button>

          {open && (
            <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-48 overflow-hidden rounded-[12px] border border-border bg-card shadow-[var(--shadow-3)]">
              <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
                <Icon name="settings" size={15} /> School settings
              </Link>
              <div className="h-px bg-border" />
              <form action={logout}>
                <button className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-red transition hover:bg-red-soft">
                  <Icon name="logout" size={15} /> Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
