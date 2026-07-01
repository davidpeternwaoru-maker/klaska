// Shared setup constants (no "use server") used by the onboarding wizard,
// the settings editors, and the server actions.

export type SectionKey = "EARLY" | "PRIMARY" | "JUNIOR" | "SENIOR";
export type GradingCategory = "SECONDARY" | "PRIMARY" | "EARLY";

// The sections a school can run. A school picks only what it actually operates,
// so a secondary-only school never sees primary levels, and vice-versa.
export const SECTIONS: { key: SectionKey; label: string; blurb: string; levels: string[]; category: GradingCategory }[] = [
  { key: "EARLY", label: "Early Years", blurb: "Crèche, KG & Nursery", levels: ["Crèche", "KG 1", "KG 2", "Nursery 1", "Nursery 2"], category: "EARLY" },
  { key: "PRIMARY", label: "Primary", blurb: "Primary 1 – 6", levels: ["Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"], category: "PRIMARY" },
  { key: "JUNIOR", label: "Junior Secondary", blurb: "JSS 1 – 3", levels: ["JSS 1", "JSS 2", "JSS 3"], category: "SECONDARY" },
  { key: "SENIOR", label: "Senior Secondary", blurb: "SSS 1 – 3", levels: ["SSS 1", "SSS 2", "SSS 3"], category: "SECONDARY" },
];

export const GRADING_CATEGORY_LABEL: Record<GradingCategory, string> = {
  SECONDARY: "Secondary (JSS & SSS)",
  PRIMARY: "Primary",
  EARLY: "Early Years",
};

export type BandTemplate = { label: string; minScore: number; maxScore: number; remark: string };

// Recommended Nigerian grading scales per category. Schools start from these
// and can edit freely.
export const GRADING_TEMPLATES: Record<GradingCategory, BandTemplate[]> = {
  // WAEC / NECO style
  SECONDARY: [
    { label: "A1", minScore: 75, maxScore: 100, remark: "Excellent" },
    { label: "B2", minScore: 70, maxScore: 74, remark: "Very good" },
    { label: "B3", minScore: 65, maxScore: 69, remark: "Good" },
    { label: "C4", minScore: 60, maxScore: 64, remark: "Credit" },
    { label: "C5", minScore: 55, maxScore: 59, remark: "Credit" },
    { label: "C6", minScore: 50, maxScore: 54, remark: "Credit" },
    { label: "D7", minScore: 45, maxScore: 49, remark: "Pass" },
    { label: "E8", minScore: 40, maxScore: 44, remark: "Pass" },
    { label: "F9", minScore: 0, maxScore: 39, remark: "Fail" },
  ],
  PRIMARY: [
    { label: "A", minScore: 70, maxScore: 100, remark: "Excellent" },
    { label: "B", minScore: 60, maxScore: 69, remark: "Very good" },
    { label: "C", minScore: 50, maxScore: 59, remark: "Credit" },
    { label: "D", minScore: 40, maxScore: 49, remark: "Pass" },
    { label: "E", minScore: 0, maxScore: 39, remark: "Needs improvement" },
  ],
  // Early years is usually descriptive rather than exam-scored.
  EARLY: [
    { label: "EX", minScore: 75, maxScore: 100, remark: "Excellent" },
    { label: "GD", minScore: 50, maxScore: 74, remark: "Good" },
    { label: "DV", minScore: 25, maxScore: 49, remark: "Developing" },
    { label: "BG", minScore: 0, maxScore: 24, remark: "Beginning" },
  ],
};

const CATEGORY_ORDER: GradingCategory[] = ["SECONDARY", "PRIMARY", "EARLY"];

/** Which grading categories are relevant, given the sections a school runs. */
export function categoriesForSections(sections: string[]): GradingCategory[] {
  const set = new Set<GradingCategory>();
  SECTIONS.forEach((s) => {
    if (sections.includes(s.key)) set.add(s.category);
  });
  return CATEGORY_ORDER.filter((c) => set.has(c));
}

/** The standard levels for the sections a school runs (for class suggestions). */
export function levelsForSections(sections: string[]): { section: SectionKey; label: string; levels: string[] }[] {
  return SECTIONS.filter((s) => sections.includes(s.key)).map((s) => ({ section: s.key, label: s.label, levels: s.levels }));
}

// Common fee lines a Nigerian school might charge (amounts start at 0 to edit).
export const SUGGESTED_FEES: { name: string; mandatory: boolean }[] = [
  { name: "Tuition", mandatory: true },
  { name: "Development levy", mandatory: true },
  { name: "Examination fee", mandatory: true },
  { name: "PTA levy", mandatory: false },
  { name: "Uniform", mandatory: false },
  { name: "Books", mandatory: false },
];

export const ARM_LETTERS = ["A", "B", "C", "D", "E", "F"];
