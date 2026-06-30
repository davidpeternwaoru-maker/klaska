"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NAV_GROUPS, type NavGroup } from "@/lib/nav";
import { Icon, KLogo } from "@/components/ui/Icon";
import { SCHOOL } from "@/data/overview";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  // Which group the current route belongs to (drives the rail highlight even
  // when the panel is collapsed).
  const routeGroup = useMemo<NavGroup>(() => {
    const exact = NAV_GROUPS.find((g) => g.items.some((i) => i.href === pathname));
    if (exact) return exact;
    const prefix = NAV_GROUPS.find((g) => g.items.some((i) => i.href !== "/" && pathname.startsWith(i.href)));
    return prefix ?? NAV_GROUPS[0];
  }, [pathname]);

  // The sub-panel is COLLAPSED by default. `openGroup` is the one sliding out.
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const open = openGroup !== null;
  // Keep showing a group's items while the panel animates closed (no flicker).
  const panelGroup = NAV_GROUPS.find((g) => g.label === openGroup) ?? routeGroup;

  // Click-away (and Escape) closes the panel. Content stays interactive.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenGroup(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenGroup(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleRailClick(group: NavGroup) {
    // Single-item groups navigate immediately; multi-item groups toggle the panel.
    if (group.items.length === 1) {
      const item = group.items[0];
      if (!item.soon) router.push(item.href);
      setOpenGroup(null);
      return;
    }
    setOpenGroup((prev) => (prev === group.label ? null : group.label));
  }

  return (
    <div ref={rootRef} className="flex h-full">
      {/* ---------- slim icon rail (always visible) ---------- */}
      <aside
        className="z-20 flex w-[68px] flex-none flex-col items-center gap-1.5 py-4"
        style={{ background: "linear-gradient(180deg,#1d6322 0%,#143d18 100%)" }}
      >
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/[0.14] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
          <KLogo size={24} white />
        </div>

        <nav className="flex w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto">
          {NAV_GROUPS.map((g) => (
            <RailIcon
              key={g.label}
              group={g}
              active={open ? openGroup === g.label : routeGroup.label === g.label}
              onClick={() => handleRailClick(g)}
            />
          ))}
        </nav>

        <button className="flex h-10 w-10 items-center justify-center rounded-[12px] text-white/70 transition hover:bg-white/10" title="Help & guides">
          <Icon name="sparkle" size={17} />
        </button>
      </aside>

      {/* ---------- collapsible slide-out sub-panel ---------- */}
      <aside
        className="z-10 h-full flex-none overflow-hidden border-border bg-card transition-[width,opacity,box-shadow] duration-[260ms] ease-[cubic-bezier(.22,.8,.28,1)]"
        style={{
          width: open ? 232 : 0,
          opacity: open ? 1 : 0,
          borderRightWidth: open ? 1 : 0,
          boxShadow: open ? "6px 0 28px -16px rgba(20,20,18,0.18)" : "none",
        }}
        aria-hidden={!open}
      >
        <div className="flex h-full w-[232px] flex-col p-3">
          {/* school switcher */}
          <button className="flex w-full items-center gap-2.5 rounded-[12px] border border-border bg-card p-2.5 text-left transition hover:bg-secondary">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-forest font-display text-[12px] font-semibold text-white">
              {SCHOOL.shortName}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold leading-tight text-ink">{SCHOOL.name}</span>
              <span className="block text-[11px] text-ink-4">{SCHOOL.term}</span>
            </span>
            <Icon name="chevD" size={14} style={{ color: "var(--color-ink-4)" }} />
          </button>

          {/* group label + items */}
          <div className="mt-5 flex min-h-0 flex-1 flex-col">
            <div className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">
              {panelGroup.label}
            </div>
            <nav key={panelGroup.label} className="k-stagger flex flex-col gap-1 overflow-y-auto">
              {panelGroup.items.map((item) => {
                const active = item.href === pathname;
                const inner = (
                  <span
                    className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] font-medium transition-colors ${
                      active
                        ? "bg-forest text-white shadow-[0_4px_14px_-6px_rgba(27,94,32,0.5)]"
                        : "text-ink-2 hover:bg-secondary"
                    }`}
                  >
                    <Icon name={item.icon} size={16} />
                    <span className="flex-1">{item.label}</span>
                    {item.soon && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                          active ? "bg-white/20 text-white" : "bg-amber-soft text-amber-2"
                        }`}
                      >
                        Soon
                      </span>
                    )}
                    {item.accent && !active && <span className="h-1.5 w-1.5 rounded-full bg-amber" />}
                  </span>
                );
                return item.soon ? (
                  <span key={item.id} className="cursor-not-allowed opacity-75" aria-disabled title="Coming next">
                    {inner}
                  </span>
                ) : (
                  <Link key={item.id} href={item.href} onClick={() => setOpenGroup(null)}>
                    {inner}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* term progress */}
          <div className="mt-auto rounded-[12px] border border-border bg-secondary/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-medium text-ink-3">Term progress</span>
              <span className="text-[12px] font-semibold text-ink">
                {SCHOOL.termWeeksDone}/{SCHOOL.termWeeksTotal} wks
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-amber transition-[width] duration-500"
                style={{ width: `${(SCHOOL.termWeeksDone / SCHOOL.termWeeksTotal) * 100}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] text-ink-4">Ends {SCHOOL.termEnds}</div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function RailIcon({ group, active, onClick }: { group: NavGroup; active: boolean; onClick: () => void }) {
  const flagged = group.items.some((i) => i.soon || i.accent);
  return (
    <button
      onClick={onClick}
      title={group.label}
      className={`group relative flex h-[52px] w-[52px] flex-col items-center justify-center gap-1 rounded-[14px] transition-[background,transform] duration-200 hover:scale-[1.05] ${
        active ? "bg-white/[0.16] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]" : "text-white/65 hover:bg-white/10 hover:text-white"
      }`}
    >
      {active && <span className="absolute -left-2 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-amber" />}
      <Icon name={group.icon} size={19} />
      <span className="text-[9px] font-semibold tracking-tight">{group.label}</span>
      {flagged && <span className="absolute right-2.5 top-2 h-1.5 w-1.5 rounded-full bg-amber ring-2 ring-[#143d18]" />}
    </button>
  );
}
