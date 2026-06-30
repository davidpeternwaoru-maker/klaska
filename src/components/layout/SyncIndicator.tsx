"use client";

import { useOffline } from "@/lib/offline/useOffline";
import { Icon } from "@/components/ui/Icon";

/** Compact offline / syncing / synced pill for the top bar. */
export function SyncIndicator() {
  const { status, pendingCount } = useOffline();

  const config = {
    synced: {
      label: "Synced",
      icon: "cloud" as const,
      fg: "var(--color-forest)",
      bg: "var(--color-forest-soft)",
      line: "var(--color-forest-line)",
      spin: false,
    },
    syncing: {
      label: pendingCount > 0 ? `Syncing ${pendingCount}…` : "Syncing…",
      icon: "refresh" as const,
      fg: "var(--color-amber-2)",
      bg: "var(--color-amber-soft)",
      line: "#F4DDB0",
      spin: true,
    },
    offline: {
      label: pendingCount > 0 ? `Offline · ${pendingCount} queued` : "Offline",
      icon: "cloudOff" as const,
      fg: "var(--color-ink-3)",
      bg: "var(--color-surface)",
      line: "var(--color-line-2)",
      spin: false,
    },
  }[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold leading-none"
      style={{ color: config.fg, background: config.bg, border: `1px solid ${config.line}` }}
      title={
        status === "offline"
          ? "You're offline. Changes are saved on this device and will sync automatically."
          : status === "syncing"
            ? "Syncing your offline changes to the server…"
            : "All changes are saved to the server."
      }
    >
      <Icon name={config.icon} size={14} className={config.spin ? "k-spin" : undefined} />
      {config.label}
    </span>
  );
}
