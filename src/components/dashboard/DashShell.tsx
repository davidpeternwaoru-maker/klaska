"use client";

// The chrome for the real, logged-in app: a left nav + a top bar showing the
// school name, the signed-in user and a logout button. usePathname highlights
// the active link. `logout` is a server action passed straight to a <form>.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, KLogo, type IconName } from "@/components/ui/Icon";
import { logout } from "@/lib/auth/actions";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Overview", icon: "home" },
  { href: "/dashboard/students", label: "Students", icon: "students" },
  { href: "/dashboard/staff", label: "Staff", icon: "badge" },
  { href: "/dashboard/classes", label: "Classes", icon: "layers" },
  { href: "/dashboard/attendance", label: "Attendance", icon: "attendance" },
  { href: "/dashboard/results", label: "Results", icon: "reports" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
];

export function DashShell({
  schoolName,
  userName,
  role,
  logoUrl,
  children,
}: {
  schoolName: string;
  userName: string;
  role: string;
  logoUrl?: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="flex h-screen overflow-hidden bg-background text-ink">
      {/* sidebar */}
      <aside className="flex w-[228px] flex-none flex-col border-r border-border bg-card p-3">
        <div className="flex items-center gap-2.5 px-2 py-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={schoolName} className="h-9 w-9 flex-none rounded-[11px] object-contain" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-forest">
              <KLogo size={22} white />
            </span>
          )}
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-semibold leading-tight text-ink">{schoolName}</div>
            <div className="text-[11px] text-ink-4">Klaska</div>
          </div>
        </div>

        <nav className="mt-5 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  active ? "bg-forest text-white" : "text-ink-2 hover:bg-secondary"
                }`}
              >
                <Icon name={item.icon} size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-[12px] border border-border bg-secondary/60 p-3">
          <div className="truncate text-[12.5px] font-medium text-ink">{userName}</div>
          <div className="text-[11px] capitalize text-ink-4">{role.toLowerCase()}</div>
          <form action={logout} className="mt-2">
            <button className="flex items-center gap-1.5 text-[12px] font-medium text-ink-3 transition hover:text-red">
              <Icon name="logout" size={14} /> Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* content */}
      <main className="flex-1 overflow-auto px-8 py-7">{children}</main>
    </div>
  );
}
