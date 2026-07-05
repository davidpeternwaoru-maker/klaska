import type { IconName } from "@/components/ui/Icon";
import type { Role } from "@/lib/auth/jwt";
import { canView, type Area } from "@/lib/auth/permissions";

/** Grouped navigation — all sections are built. */
export type NavItem = {
  id: string;
  label: string;
  icon: IconName;
  href: string;
  soon?: boolean;
  accent?: boolean;
  area?: Area; // permission area gating visibility (undefined = everyone)
};
export type NavGroup = { label: string; icon: IconName; items: NavItem[] };

/** The nav a given role actually sees (Permission Matrix §5). */
export function navForRole(role: Role | null): NavGroup[] {
  if (!role) return NAV_GROUPS; // signed-out demo browsing keeps full nav
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.area || canView(role, i.area)) })).filter(
    (g) => g.items.length > 0,
  );
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    icon: "home",
    items: [{ id: "overview", label: "Dashboard", icon: "home", href: "/" }],
  },
  {
    label: "Academics",
    icon: "reports",
    items: [
      { id: "results", label: "Results Entry", icon: "edit", href: "/academics/results", area: "results" },
      { id: "reports", label: "Report Cards & Results", icon: "reports", href: "/academics/reports", area: "results" },
      { id: "ai", label: "AI Outcomes Engine", icon: "ai", href: "/academics/ai", accent: true, area: "ai" },
    ],
  },
  {
    label: "People",
    icon: "students",
    items: [
      { id: "students", label: "Students", icon: "students", href: "/people/students", area: "students" },
      { id: "classes", label: "Classes", icon: "layers", href: "/people/classes", area: "students" },
      { id: "attendance", label: "Attendance", icon: "attendance", href: "/people/attendance", area: "attendance" },
      { id: "promotions", label: "Promotions", icon: "arrowU", href: "/people/promotions", area: "promotions" },
      { id: "staff", label: "Staff & Payroll", icon: "badge", href: "/people/staff", area: "staff" },
      { id: "appraisals", label: "Staff Appraisals", icon: "target", href: "/people/appraisals", accent: true, area: "appraisals" },
    ],
  },
  {
    label: "Finance",
    icon: "wallet",
    items: [
      { id: "fees", label: "Fees & Payments", icon: "fees", href: "/finance/fees", area: "fees" },
      { id: "financial", label: "Financial System", icon: "finance", href: "/finance/system", area: "financial" },
      { id: "financing", label: "Embedded Financing", icon: "coins", href: "/finance/financing", area: "financial" },
    ],
  },
  {
    label: "Insights",
    icon: "trend",
    items: [{ id: "retention", label: "Retention & Analytics", icon: "shield", href: "/insights", area: "insights" }],
  },
  {
    label: "Settings",
    icon: "settings",
    items: [
      { id: "settings", label: "School Settings", icon: "settings", href: "/settings", area: "settings" },
      { id: "notifications", label: "Notifications", icon: "bell", href: "/settings/notifications", area: "notifications" },
    ],
  },
];
