import type { IconName } from "@/components/ui/Icon";

/** Grouped navigation — all sections are built. */
export type NavItem = {
  id: string;
  label: string;
  icon: IconName;
  href: string;
  soon?: boolean;
  accent?: boolean;
};
export type NavGroup = { label: string; icon: IconName; items: NavItem[] };

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
      { id: "results", label: "Results Entry", icon: "edit", href: "/academics/results" },
      { id: "reports", label: "Report Cards & Results", icon: "reports", href: "/academics/reports" },
      { id: "ai", label: "AI Outcomes Engine", icon: "ai", href: "/academics/ai", accent: true },
    ],
  },
  {
    label: "People",
    icon: "students",
    items: [
      { id: "students", label: "Students", icon: "students", href: "/people/students" },
      { id: "classes", label: "Classes", icon: "layers", href: "/people/classes" },
      { id: "attendance", label: "Attendance", icon: "attendance", href: "/people/attendance" },
      { id: "promotions", label: "Promotions", icon: "arrowU", href: "/people/promotions" },
      { id: "staff", label: "Staff & Payroll", icon: "badge", href: "/people/staff" },
      { id: "appraisals", label: "Staff Appraisals", icon: "target", href: "/people/appraisals", accent: true },
    ],
  },
  {
    label: "Finance",
    icon: "wallet",
    items: [
      { id: "fees", label: "Fees & Payments", icon: "fees", href: "/finance/fees" },
      { id: "financial", label: "Financial System", icon: "finance", href: "/finance/system" },
      { id: "financing", label: "Embedded Financing", icon: "coins", href: "/finance/financing" },
    ],
  },
  {
    label: "Insights",
    icon: "trend",
    items: [{ id: "retention", label: "Retention & Analytics", icon: "shield", href: "/insights" }],
  },
  {
    label: "Settings",
    icon: "settings",
    items: [
      { id: "settings", label: "School Settings", icon: "settings", href: "/settings" },
      { id: "notifications", label: "Notifications", icon: "bell", href: "/settings/notifications" },
    ],
  },
];
