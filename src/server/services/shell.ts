import "server-only";

// App shell — the logged-in school summary the sidebar/topbar show on every page.

import { prisma } from "@/lib/db";
import { detectTerm, termProgress, TERM_LABEL, fmtShortDate, type TermKey } from "@/lib/terms";
import { type Ctx } from "@/server/context";
import type { ShellSchool } from "@/components/layout/AppShell";

export const shellService = {
  async school(ctx: Ctx): Promise<ShellSchool> {
    const s = await prisma.school.findUnique({
      where: { id: ctx.schoolId },
      select: { name: true, shortName: true, logoUrl: true, session: true, term: true, termStart: true, termEnd: true },
    });
    if (!s) return null;
    const fallback = detectTerm();
    const termKey = (s.term as TermKey) || fallback.term;
    const start = s.termStart ?? fallback.termStart;
    const end = s.termEnd ?? fallback.termEnd;
    const prog = termProgress(start, end);
    return {
      name: s.name || "Your school",
      shortName: s.shortName || (s.name || "KL").slice(0, 2).toUpperCase(),
      logoUrl: s.logoUrl,
      session: s.session || fallback.session,
      termLabel: TERM_LABEL[termKey],
      weeksDone: prog.weeksDone,
      weeksTotal: prog.weeksTotal,
      termEnds: fmtShortDate(end),
    };
  },
};
