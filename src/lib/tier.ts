// Tiering & monetisation architecture: one core engine, feature flags decide
// what each school sees. Pricing follows operational complexity, not just size.

export type Tier = "BASIC" | "ENTERPRISE";

export const TIER_LABEL: Record<Tier, string> = { BASIC: "Basic", ENTERPRISE: "Enterprise" };

// Which tier unlocks which module.
const ENTERPRISE_ONLY = new Set([
  "virtualAccounts", // automatic virtual accounts per student (Paystack/Flutterwave)
  "aiEngine", // AI Outcomes Engine
  "deptAnalysis", // multi-department analysis + HOD approval workflows
  "crossTerm", // cross-term trends, retention, multi-year history
  "multiCampus", // School → Campus hierarchy
]);

export type Feature = "virtualAccounts" | "aiEngine" | "deptAnalysis" | "crossTerm" | "multiCampus";

export function hasFeature(tier: string | null | undefined, feature: Feature): boolean {
  const t: Tier = tier === "ENTERPRISE" ? "ENTERPRISE" : "BASIC";
  return t === "ENTERPRISE" || !ENTERPRISE_ONLY.has(feature);
}

export const TIER_FEATURES: Record<Tier, string[]> = {
  BASIC: [
    "Manual fee recording (bursar logs cash/transfers)",
    "Standard A1–F9 report card printing",
    "Current-session history",
    "Attendance, results, students, staff — the full core",
  ],
  ENTERPRISE: [
    "Everything in Basic",
    "Automatic virtual accounts per student (coming with payments integration)",
    "AI Outcomes Engine + multi-department analysis",
    "HOD approval workflows",
    "Cross-term trends, retention insights, multi-year history",
    "Multi-campus structure (Primary + Secondary under one owner)",
  ],
};
