import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { RealOverview } from "@/components/overview/RealOverview";
import { BursarOverview, TeacherOverview } from "@/components/overview/RoleOverviews";
import { detectTerm } from "@/lib/terms";

// Role decides the view (Matrix §5): Owner = full (incl. money), HOS/HOD =
// academic, Bursar = finance, Teacher = own classes, Admin = basic records.
const greetOf = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return /^(mr|mrs|ms|miss|dr|chief|engr|prof)\.?$/i.test(parts[0]) && parts[1] ? parts.slice(0, 2).join(" ") : parts[0];
};

export default async function Home() {
  const user = await requireUser();
  const school = await prisma.school.findUnique({ where: { id: user.schoolId }, select: { name: true, session: true, term: true, termStart: true } });
  const schoolName = school?.name || "Your school";
  const greet = greetOf(user.name);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  /* ---- BURSAR: finance overview ---- */
  if (user.role === "BURSAR") {
    const termStart = school?.termStart ?? detectTerm().termStart;
    const [invAgg, payments, owing] = await Promise.all([
      prisma.invoice.aggregate({
        where: { schoolId: user.schoolId, ...(school?.session && school.term ? { session: school.session, term: school.term } : {}) },
        _sum: { total: true },
      }),
      prisma.payment.findMany({ where: { schoolId: user.schoolId, paidAt: { gte: termStart } }, include: { student: true }, orderBy: { paidAt: "desc" }, take: 8 }),
      prisma.payment.groupBy({ by: ["invoiceId"], where: { schoolId: user.schoolId }, _sum: { amount: true } }),
    ]);
    const invoiced = invAgg._sum.total ?? 0;
    const collectedAgg = await prisma.payment.aggregate({ where: { schoolId: user.schoolId, paidAt: { gte: termStart } }, _sum: { amount: true } });
    const collected = collectedAgg._sum.amount ?? 0;
    const paidByInvoice = new Map(owing.map((o) => [o.invoiceId, o._sum.amount ?? 0]));
    const invoices = await prisma.invoice.findMany({
      where: { schoolId: user.schoolId, ...(school?.session && school.term ? { session: school.session, term: school.term } : {}) },
      select: { id: true, total: true },
    });
    const owingCount = invoices.filter((i) => (paidByInvoice.get(i.id) ?? 0) < i.total).length;

    return (
      <BursarOverview
        greet={greet}
        schoolName={schoolName}
        money={{ invoiced, collected, outstanding: Math.max(0, invoiced - collected), owingCount }}
        recentPayments={payments.map((p) => ({
          id: p.id,
          student: `${p.student.firstName} ${p.student.lastName}`,
          amount: p.amount,
          method: p.method,
          when: p.paidAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        }))}
      />
    );
  }

  /* ---- TEACHER: own-class overview ---- */
  if (user.role === "TEACHER") {
    const classes = await prisma.class.findMany({
      where: { schoolId: user.schoolId, teacherId: user.staffId },
      include: { _count: { select: { students: true } } },
      orderBy: [{ name: "asc" }, { arm: "asc" }],
    });
    const classIds = classes.map((c) => c.id);
    const [myStudents, presentToday] = await Promise.all([
      prisma.student.count({ where: { schoolId: user.schoolId, classId: { in: classIds } } }),
      prisma.attendance.count({ where: { schoolId: user.schoolId, classId: { in: classIds }, date: startOfToday, status: { in: ["PRESENT", "LATE"] } } }),
    ]);
    return (
      <TeacherOverview
        greet={greet}
        schoolName={schoolName}
        classes={classes.map((c) => ({ id: c.id, label: c.arm ? `${c.name} ${c.arm}` : c.name, students: c._count.students }))}
        presentToday={presentToday}
        myStudents={myStudents}
      />
    );
  }

  /* ---- OWNER / HOS / HOD / ADMIN: shared shape, different variant ---- */
  const where = { schoolId: user.schoolId };
  const [students, staff, classes, present, recent] = await Promise.all([
    prisma.student.count({ where }),
    prisma.staff.count({ where }),
    prisma.class.count({ where }),
    prisma.attendance.count({ where: { schoolId: user.schoolId, status: "PRESENT", date: startOfToday } }),
    prisma.student.findMany({ where, orderBy: { createdAt: "desc" }, take: 6, include: { class: true } }),
  ]);

  // Owner is the only overview with the money picture (Matrix: Owner Full).
  let money: { collected: number; outstanding: number } | null = null;
  if (user.role === "OWNER") {
    const termStart = school?.termStart ?? detectTerm().termStart;
    const [collectedAgg, invAgg] = await Promise.all([
      prisma.payment.aggregate({ where: { schoolId: user.schoolId, paidAt: { gte: termStart } }, _sum: { amount: true } }),
      prisma.invoice.aggregate({
        where: { schoolId: user.schoolId, ...(school?.session && school.term ? { session: school.session, term: school.term } : {}) },
        _sum: { total: true },
      }),
    ]);
    const collected = collectedAgg._sum.amount ?? 0;
    money = { collected, outstanding: Math.max(0, (invAgg._sum.total ?? 0) - collected) };
  }

  const variant = user.role === "ADMIN" ? "basic" : user.role === "HOS" || user.role === "HOD" ? "academic" : "full";

  return (
    <RealOverview
      schoolName={schoolName}
      userName={user.name}
      counts={{ students, staff, classes, present }}
      recent={recent.map((s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        admissionNo: s.admissionNo,
        className: s.class ? (s.class.arm ? `${s.class.name} ${s.class.arm}` : s.class.name) : null,
      }))}
      money={money}
      variant={variant}
    />
  );
}
