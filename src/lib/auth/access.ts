// The authoritative route → permission-area map. One place that says which
// area of the Permission Matrix each URL belongs to, so the edge middleware AND
// the pages enforce the SAME rule. Edge-safe: only pure matrix types, no DB/Node.

import type { Area } from "./permissions";

// Longest / most-specific prefixes first so "/settings/notifications" wins over
// "/settings", and "/people/students" covers its /manage, /import, /[id] children.
export const ROUTE_AREAS: { prefix: string; area: Area }[] = [
  { prefix: "/academics/results", area: "results" },
  { prefix: "/academics/report-cards", area: "results" },
  { prefix: "/academics/analysis", area: "results" },
  { prefix: "/academics/subjects", area: "results" },
  { prefix: "/academics/ai", area: "ai" },
  { prefix: "/people/students", area: "students" },
  { prefix: "/people/classes", area: "students" },
  { prefix: "/people/attendance", area: "attendance" },
  { prefix: "/people/promotions", area: "promotions" },
  { prefix: "/people/staff", area: "staff" },
  { prefix: "/people/appraisals", area: "appraisals" },
  { prefix: "/finance/fees", area: "fees" },
  { prefix: "/finance/system", area: "financial" },
  { prefix: "/finance/financing", area: "financial" },
  { prefix: "/insights", area: "insights" },
  { prefix: "/settings/notifications", area: "notifications" },
  { prefix: "/settings", area: "settings" },
];

/** The permission area a path belongs to, or null for auth-only routes
 *  (/, /onboarding, /account/*, /dashboard/* redirect stubs). */
export function areaForPath(pathname: string): Area | null {
  const hit = ROUTE_AREAS.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  return hit?.area ?? null;
}
