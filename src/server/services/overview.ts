import "server-only";

// Overview — the role-specific dashboard data (Matrix §5). Owner = full (incl.
// money), HOS/HOD = academic, Bursar = finance, Teacher = own classes, Admin =
// basic records. The page picks the component; all data lives here.

import { prisma } from "@/lib/db";
import { detectTerm } from "@/lib/terms";
import { type Ctx } from "@/server/context";

const classLabel = (c: { name: string; arm: string | null }) => (c.arm ? `${c.name} ${c.arm}` : c.name);
const greetOf = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return /^(mr|mrs|ms|miss|dr|chief|engr|prof)\.?$/i.test(parts[0]) && parts[1] ? parts.slice(0, 2).join(" ") : parts[0];
};
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const schoolMeta = (ctx: Ctx) =>
  prisma.school.findUnique({ where: { id: ctx.schoolId }, select: { name: true, session: true, term: true, termStart: true } });

export type BursarOverviewData = {
  greet: string;
  schoolName: string;
  money: { invoiced: number; collected: number; outstanding: number; owingCount: number };
  recentPayments: { id: string; student: string; amount: number; method: string; when: string }[];
};

export type TeacherOverviewData = {
  greet: string;
  schoolName: string;
  classes: { id: string; label: string; students: number }[];
  presentToday: number;
  myStudents: number;
};

export type GeneralOverviewData = {
  schoolName: string;
  userName: string;
  counts: { students: number; staff: number; classes: number; present: number };
  recent: { id: string; name: string; admissionNo: string | null; className: string | null }[];
  money: { collected: number; outstanding: number } | null;
  variant: "basic" | "academic" | "full";
};

export const overviewService = {
  async bursar(ctx: Ctx): Promise<BursarOverviewData> {
    const school = await schoolMeta(ctx);
    const termStart = school?.termStart ?? detectTerm().termStart;
    const termFilter = school?.session && school.term ? { session: school.session, term: school.term } : {};
    const [invAgg, payments, collectedAgg, invoices] = await Promise.all([
      prisma.invoice.aggregate({ where: { schoolId: ctx.schoolId, ...termFilter }, _sum: { total: true } }),
      prisma.payment.findMany({ where: { schoolId: ctx.schoolId, paidAt: { gte: termStart } }, include: { student: true }, orderBy: { paidAt: "desc" }, take: 8 }),
      prisma.payment.aggregate({ where: { schoolId: ctx.schoolId, paidAt: { gte: termStart } }, _sum: { amount: true } }),
      prisma.invoice.findMany({ where: { schoolId: ctx.schoolId, ...termFilter }, select: { id: true, total: true } }),
    ]);
    const paidByInvoice = new Map(
      (await prisma.payment.groupBy({ by: ["invoiceId"], where: { schoolId: ctx.schoolId }, _sum: { amount: true } })).map((o) => [o.invoiceId, o._sum.amount ?? 0]),
    );
    const invoiced = invAgg._sum.total ?? 0;
    const collected = collectedAgg._sum.amount ?? 0;
    return {
      greet: greetOf(ctx.name),
      schoolName: school?.name || "Your school",
      money: { invoiced, collected, outstanding: Math.max(0, invoiced - collected), owingCount: invoices.filter((i) => (paidByInvoice.get(i.id) ?? 0) < i.total).length },
      recentPayments: payments.map((p) => ({ id: p.id, student: `${p.student.firstName} ${p.student.lastName}`, amount: p.amount, method: p.method, when: p.paidAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) })),
    };
  },

  async teacher(ctx: Ctx): Promise<TeacherOverviewData> {
    const school = await schoolMeta(ctx);
    const classes = await prisma.class.findMany({
      where: { schoolId: ctx.schoolId, teacherId: ctx.staffId },
      include: { _count: { select: { students: true } } },
      orderBy: [{ name: "asc" }, { arm: "asc" }],
    });
    const classIds = classes.map((c) => c.id);
    const [myStudents, presentToday] = await Promise.all([
      prisma.student.count({ where: { schoolId: ctx.schoolId, classId: { in: classIds } } }),
      prisma.attendance.count({ where: { schoolId: ctx.schoolId, classId: { in: classIds }, date: startOfToday(), status: { in: ["PRESENT", "LATE"] } } }),
    ]);
    return {
      greet: greetOf(ctx.name),
      schoolName: school?.name || "Your school",
      classes: classes.map((c) => ({ id: c.id, label: classLabel(c), students: c._count.students })),
      presentToday,
      myStudents,
    };
  },

  async general(ctx: Ctx): Promise<GeneralOverviewData> {
    const school = await schoolMeta(ctx);
    const where = { schoolId: ctx.schoolId };
    const [students, staff, classes, present, recent] = await Promise.all([
      prisma.student.count({ where }),
      prisma.staff.count({ where }),
      prisma.class.count({ where }),
      prisma.attendance.count({ where: { schoolId: ctx.schoolId, status: "PRESENT", date: startOfToday() } }),
      prisma.student.findMany({ where, orderBy: { createdAt: "desc" }, take: 6, include: { class: true } }),
    ]);

    let money: { collected: number; outstanding: number } | null = null;
    if (ctx.role === "OWNER") {
      const termStart = school?.termStart ?? detectTerm().termStart;
      const termFilter = school?.session && school.term ? { session: school.session, term: school.term } : {};
      const [collectedAgg, invAgg] = await Promise.all([
        prisma.payment.aggregate({ where: { schoolId: ctx.schoolId, paidAt: { gte: termStart } }, _sum: { amount: true } }),
        prisma.invoice.aggregate({ where: { schoolId: ctx.schoolId, ...termFilter }, _sum: { total: true } }),
      ]);
      const collected = collectedAgg._sum.amount ?? 0;
      money = { collected, outstanding: Math.max(0, (invAgg._sum.total ?? 0) - collected) };
    }

    return {
      schoolName: school?.name || "Your school",
      userName: ctx.name,
      counts: { students, staff, classes, present },
      recent: recent.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, admissionNo: s.admissionNo, className: s.class ? classLabel(s.class) : null })),
      money,
      variant: ctx.role === "ADMIN" ? "basic" : ctx.role === "HOS" || ctx.role === "HOD" ? "academic" : "full",
    };
  },
};
