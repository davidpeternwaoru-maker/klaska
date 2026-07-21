import "server-only";

// Academics reads — Report Analysis, the AI Outcomes Engine, and Report Cards.
// These compose the domain builders (analysis / ai-real / reportcard) with the
// school-meta + class queries so the pages hold no prisma of their own.

import { prisma } from "@/lib/db";
import { buildSchoolAnalysis } from "@/lib/analysis";
import { buildAIOutcomes } from "@/lib/ai-real";
import { buildClassCards } from "@/lib/reportcard";
import { hasFeature } from "@/lib/tier";
import { detectTerm, TERM_LABEL, fmtShortDate, type TermKey } from "@/lib/terms";
import { type Ctx, classScopeWhere } from "@/server/context";

const classLabel = (c: { name: string; arm: string | null }) => (c.arm ? `${c.name} ${c.arm}` : c.name);

type AnalysisData = Awaited<ReturnType<typeof buildSchoolAnalysis>>;
type AIData = Awaited<ReturnType<typeof buildAIOutcomes>>;
type CardsData = NonNullable<Awaited<ReturnType<typeof buildClassCards>>>;

export type AnalysisView = { a: AnalysisData; meta: { school: string; session: string; termLabel: string } };
export type AIView = { locked: boolean; a: AIData | null };
export type ReportCardsView = {
  hasClasses: boolean;
  classOptions: { value: string; label: string }[];
  classId: string;
  data: CardsData | null;
};

export const analysisService = {
  async view(ctx: Ctx): Promise<AnalysisView> {
    const [a, school] = await Promise.all([
      buildSchoolAnalysis(ctx),
      prisma.school.findUnique({ where: { id: ctx.schoolId }, select: { name: true, session: true, term: true } }),
    ]);
    const fallback = detectTerm();
    const termKey = (school?.term as TermKey) || fallback.term;
    return { a, meta: { school: school?.name || "Your school", session: school?.session || fallback.session, termLabel: TERM_LABEL[termKey] } };
  },
};

export const aiService = {
  async view(ctx: Ctx): Promise<AIView> {
    const school = await prisma.school.findUnique({ where: { id: ctx.schoolId }, select: { tier: true } });
    if (!hasFeature(school?.tier, "aiEngine")) return { locked: true, a: null };
    return { locked: false, a: await buildAIOutcomes(ctx) };
  },
};

export const reportCardsService = {
  async view(ctx: Ctx, classIdParam?: string): Promise<ReportCardsView> {
    const classes = await prisma.class.findMany({ where: classScopeWhere(ctx), orderBy: [{ name: "asc" }, { arm: "asc" }] });
    const classId = classIdParam && classes.some((c) => c.id === classIdParam) ? classIdParam : classes[0]?.id ?? "";
    const classOptions = classes.map((c) => ({ value: c.id, label: classLabel(c) }));
    if (!classId) return { hasClasses: classes.length > 0, classOptions, classId: "", data: null };
    const data = await buildClassCards(ctx, classId);
    return { hasClasses: classes.length > 0, classOptions, classId, data };
  },
};

export { detectTerm, TERM_LABEL, fmtShortDate, type TermKey };
