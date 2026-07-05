// FULL JOURNEY CHECK against the live server + Neon:
// school with completed setup + term, classes (incl. SSS departments), students,
// attendance mark, subject + result, per-class fees — then loads every polished
// page with a real session and confirms the school's own data appears.
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const { SignJWT } = require("jose");
const env = fs.readFileSync(".env", "utf8");
const url = (env.match(/DATABASE_URL="([^"]+)"/) || [])[1];
const secret = (env.match(/AUTH_SECRET="([^"]+)"/) || [])[1];
const prisma = new PrismaClient({ datasources: { db: { url } } });

const ok = (b) => (b ? "✅" : "❌");
let fails = 0;
const check = (label, b) => { console.log(ok(b), label); if (!b) fails++; };

(async () => {
  const email = `journey+${Date.now()}@klaska.test`;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const school = await prisma.school.create({
    data: {
      name: "Sunrise College", shortName: "SC", motto: "Light and Truth",
      sections: ["JUNIOR", "SENIOR"], setupCompletedAt: new Date(),
      session: "2025/2026", term: "THIRD", termStart: new Date(2026, 3, 27), termEnd: new Date(2026, 6, 24),
      staff: { create: { name: "Ada Proprietor", title: "Proprietor", email, passwordHash: "x", role: "OWNER" } },
    },
    include: { staff: true },
  });
  const owner = school.staff[0];
  const jss1 = await prisma.class.create({ data: { schoolId: school.id, name: "JSS 1", arm: "A" } });
  const sci = await prisma.class.create({ data: { schoolId: school.id, name: "SSS 1", arm: "Science" } });
  const s1 = await prisma.student.create({ data: { schoolId: school.id, firstName: "Bola", lastName: "Ade", admissionNo: "KLK-0001", classId: jss1.id } });
  await prisma.student.create({ data: { schoolId: school.id, firstName: "Chike", lastName: "Obi", admissionNo: "KLK-0002", classId: sci.id } });
  await prisma.attendance.create({ data: { schoolId: school.id, studentId: s1.id, classId: jss1.id, date: today, status: "PRESENT" } });
  const math = await prisma.subject.create({ data: { schoolId: school.id, name: "Mathematics" } });
  await prisma.result.create({ data: { schoolId: school.id, studentId: s1.id, subjectId: math.id, classId: jss1.id, ca1: 15, ca2: 16, exam: 45, total: 76, grade: "A1" } });
  const tuition = await prisma.feeItem.create({ data: { schoolId: school.id, name: "Tuition", order: 0 } });
  await prisma.classFee.create({ data: { schoolId: school.id, feeItemId: tuition.id, classId: sci.id, amount: 250000 } });

  const key = new TextEncoder().encode(secret);
  const token = await new SignJWT({ staffId: owner.id, schoolId: school.id, role: "OWNER", name: owner.name, email })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(key);
  const H = { headers: { cookie: `klaska_session=${token}` }, redirect: "manual" };
  const get = async (p) => { const r = await fetch(`http://localhost:3000${p}`, H); return { status: r.status, html: await r.text() }; };

  let r = await get("/");
  check("HOME: school name + Third Term + student", r.status === 200 && /Sunrise College/.test(r.html) && /Third Term/.test(r.html) && /Bola/.test(r.html));
  r = await get("/people/students");
  check("STUDENTS: both students + classes", r.status === 200 && /Bola/.test(r.html) && /Chike/.test(r.html) && /SSS 1 Science/.test(r.html));
  r = await get("/people/classes");
  check("CLASSES: JSS 1 A + SSS 1 Science", r.status === 200 && /JSS 1/.test(r.html) && /Science/.test(r.html));
  r = await get("/people/staff");
  check("STAFF: owner listed", r.status === 200 && /Ada Proprietor/.test(r.html));
  r = await get(`/people/attendance?classId=${jss1.id}&date=${today.toISOString().slice(0, 10)}`);
  check("ATTENDANCE: student + saved mark UI", r.status === 200 && /Bola/.test(r.html) && /Save attendance/.test(r.html));
  r = await get(`/academics/results?classId=${jss1.id}&subjectId=${math.id}`);
  check("RESULTS: student + saved A1 grade", r.status === 200 && /Bola/.test(r.html) && /A1/.test(r.html));
  r = await get("/finance/fees");
  check("FEES: collection design renders (banner + class grid + tabs)", r.status === 200 && /Fees collection/.test(r.html) && /Collection rate by class/.test(r.html) && /Unpaid/.test(r.html));
  r = await get("/settings");
  check("SETTINGS: session & term tab present", r.status === 200 && /Session &amp; term/.test(r.html));
  r = await get("/settings/notifications");
  check("NOTIFICATIONS: compose renders", r.status === 200 && /Send a message/.test(r.html));
  // ---- Finance core: invoice + payment reflected on the money screen ----
  const tuitionJss = await prisma.feeItem.create({ data: { schoolId: school.id, name: "Tuition JSS", order: 1 } });
  await prisma.classFee.create({ data: { schoolId: school.id, feeItemId: tuitionJss.id, classId: jss1.id, amount: 120000 } });
  const inv = await prisma.invoice.create({
    data: { schoolId: school.id, studentId: s1.id, session: "2025/2026", term: "THIRD", total: 120000, lines: { create: [{ description: "Tuition", amount: 120000 }] } },
  });
  await prisma.payment.create({ data: { schoolId: school.id, studentId: s1.id, invoiceId: inv.id, amount: 50000, method: "TRANSFER", recordedBy: "Ada" } });
  r = await get("/finance/fees");
  check("FINANCE: invoice + part-payment shown", r.status === 200 && /Partial/.test(r.html) && /120,000/.test(r.html) && /50,000/.test(r.html) && /Fees collection/.test(r.html));

  // ---- Report cards from real results (needs grading bands for remarks) ----
  await prisma.gradingBand.createMany({
    data: [
      { schoolId: school.id, category: "SECONDARY", label: "A1", minScore: 75, maxScore: 100, remark: "Excellent", order: 0 },
      { schoolId: school.id, category: "SECONDARY", label: "F9", minScore: 0, maxScore: 39, remark: "Fail", order: 8 },
    ],
  });
  r = await get(`/academics/report-cards?classId=${jss1.id}`);
  check("REPORT CARDS: ranked list + 1st position + average", r.status === 200 && /Bola/.test(r.html) && /1st/.test(r.html) && /76(<!-- -->)?%/.test(r.html));

  // ---- Layer 4: analysis + financial system on real data ----
  r = await get("/academics/analysis");
  check("ANALYSIS: class avg + best student + subject", r.status === 200 && /JSS 1 A/.test(r.html) && /Bola/.test(r.html) && /Mathematics/.test(r.html));
  await prisma.expense.create({ data: { schoolId: school.id, category: "SALARIES", description: "May salaries", amount: 30000 } });
  r = await get("/finance/system");
  check("FINANCIAL SYSTEM: collected, expenses, net", r.status === 200 && /50,000/.test(r.html) && /30,000/.test(r.html) && /20,000/.test(r.html));

  r = await get("/academics/ai");
  check("AI OUTCOMES: real readiness + student status", r.status === 200 && /Bola/.test(r.html) && /On track|Borderline|At risk/.test(r.html) && /Readiness by class/.test(r.html));

  // ---- Permission matrix: a TEACHER sees only their class, never money ----
  const tEmail = `teach+${Date.now()}@klaska.test`;
  const teacher = await prisma.staff.create({ data: { schoolId: school.id, name: "Tunde Teacher", email: tEmail, passwordHash: "x", role: "TEACHER" } });
  await prisma.class.update({ where: { id: jss1.id }, data: { teacherId: teacher.id } });
  const tTok = await new SignJWT({ staffId: teacher.id, schoolId: school.id, role: "TEACHER", name: teacher.name, email: tEmail })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(key);
  const T = { headers: { cookie: `klaska_session=${tTok}` }, redirect: "manual" };
  let tr = await fetch("http://localhost:3000/finance/fees", T);
  check("TEACHER: money page blocked (redirect)", tr.status === 307);
  tr = await fetch("http://localhost:3000/people/attendance", T);
  const th = await tr.text();
  check("TEACHER: sees own class only (JSS 1, no Science)", tr.status === 200 && /JSS 1/.test(th) && !/SSS 1 Science/.test(th));

  const anon = await fetch("http://localhost:3000/", { redirect: "manual" });
  check("ANON home -> /login", anon.status === 307 && (anon.headers.get("location") || "").includes("/login"));

  await prisma.school.delete({ where: { id: school.id } });
  console.log(fails === 0 ? "\nALL CHECKS PASSED 🎉 (cleanup done)" : `\n${fails} CHECK(S) FAILED (cleanup done)`);
  await prisma.$disconnect();
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error("JOURNEY FAILED:", e.message); process.exit(1); });
