// Dashboard layout — a Server Component. It runs requireUser() so every page
// under /dashboard is guaranteed to have a logged-in user (belt-and-braces with
// the middleware), then loads the school name for the sidebar.

import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { DashShell } from "@/components/dashboard/DashShell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const school = await prisma.school.findUnique({ where: { id: user.schoolId }, select: { name: true } });

  return (
    <DashShell schoolName={school?.name ?? "Your school"} userName={user.name} role={user.role}>
      {children}
    </DashShell>
  );
}
