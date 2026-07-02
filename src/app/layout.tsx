import type { Metadata } from "next";
import { Geist, Space_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { detectTerm, termProgress, TERM_LABEL, fmtShortDate, type TermKey } from "@/lib/terms";

// Premium, modern type — Geist for UI text, Space Grotesk for display numerals.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "Klaska — School OS",
  description: "The operating system for modern Nigerian private schools.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // If someone is logged in, load their real school so the sidebar shows it.
  const user = await getCurrentUser();
  let school: import("@/components/layout/AppShell").ShellSchool = null;
  if (user) {
    const s = await prisma.school.findUnique({
      where: { id: user.schoolId },
      select: { name: true, shortName: true, logoUrl: true, session: true, term: true, termStart: true, termEnd: true },
    });
    if (s) {
      const fallback = detectTerm();
      const termKey = (s.term as TermKey) || fallback.term;
      const start = s.termStart ?? fallback.termStart;
      const end = s.termEnd ?? fallback.termEnd;
      const prog = termProgress(start, end);
      school = {
        name: s.name || "Your school",
        shortName: s.shortName || (s.name || "KL").slice(0, 2).toUpperCase(),
        logoUrl: s.logoUrl,
        session: s.session || fallback.session,
        termLabel: TERM_LABEL[termKey],
        weeksDone: prog.weeksDone,
        weeksTotal: prog.weeksTotal,
        termEnds: fmtShortDate(end),
      };
    }
  }

  return (
    <html
      lang="en"
      className={cn("h-full", geist.variable, spaceGrotesk.variable, geistMono.variable, "font-sans")}
    >
      <body className="min-h-full">
        <AppShell school={school}>{children}</AppShell>
      </body>
    </html>
  );
}
