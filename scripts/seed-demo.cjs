// Seeds a permanent DEMO school so reviewers can log in and see Klaska full of
// life (students, results, fees, AI) without touching real schools' data.
// Idempotent: re-running wipes and recreates the demo school only.
//   Owner:   owner@klaskademo.com / demo1234
//   Teacher: teacher@klaskademo.com / demo1234
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const url = (fs.readFileSync(".env", "utf8").match(/DATABASE_URL="([^"]+)"/) || [])[1];
const prisma = new PrismaClient({ datasources: { db: { url } } });

const gradeFor = (t) => (t >= 75 ? "A1" : t >= 70 ? "B2" : t >= 65 ? "B3" : t >= 60 ? "C4" : t >= 55 ? "C5" : t >= 50 ? "C6" : t >= 45 ? "D7" : t >= 40 ? "E8" : "F9");

(async () => {
  // wipe any previous demo school
  const old = await prisma.staff.findUnique({ where: { email: "owner@klaskademo.com" } });
  if (old) await prisma.school.delete({ where: { id: old.schoolId } });

  const hash = await bcrypt.hash("demo1234", 10);
  const school = await prisma.school.create({
    data: {
      name: "Sunrise Model College",
      shortName: "SMC",
      motto: "Knowledge and Character",
      address: "14 Unity Road, Ikeja, Lagos",
      email: "info@sunrisemodel.ng",
      phone: "0803 000 0000",
      sections: ["JUNIOR", "SENIOR"],
      setupCompletedAt: new Date(),
      session: "2025/2026",
      term: "THIRD",
      termStart: new Date(2026, 3, 27),
      termEnd: new Date(2026, 6, 24),
      tier: "ENTERPRISE",
      staff: {
        create: [
          { name: "Mrs. Adaeze Nwosu", title: "Proprietress", email: "owner@klaskademo.com", passwordHash: hash, role: "OWNER" },
          { name: "Mr. Tunde Bakare", title: "Mathematics Teacher", email: "teacher@klaskademo.com", passwordHash: hash, role: "TEACHER" },
          { name: "Mrs. Funke Ojo", title: "Bursar", email: "bursar@klaskademo.com", passwordHash: hash, role: "BURSAR" },
        ],
      },
    },
    include: { staff: true },
  });
  const owner = school.staff.find((s) => s.role === "OWNER");
  const teacher = school.staff.find((s) => s.role === "TEACHER");

  // grading bands (WAEC style)
  const bands = [
    ["A1", 75, 100, "Excellent"], ["B2", 70, 74, "Very good"], ["B3", 65, 69, "Good"],
    ["C4", 60, 64, "Credit"], ["C5", 55, 59, "Credit"], ["C6", 50, 54, "Credit"],
    ["D7", 45, 49, "Pass"], ["E8", 40, 44, "Pass"], ["F9", 0, 39, "Fail"],
  ];
  await prisma.gradingBand.createMany({
    data: bands.map(([label, minScore, maxScore, remark], i) => ({ schoolId: school.id, category: "SECONDARY", label, minScore, maxScore, remark, order: i })),
  });

  // classes (teacher owns JSS 1 A) + subjects
  const jss1 = await prisma.class.create({ data: { schoolId: school.id, name: "JSS 1", arm: "A", teacherId: teacher.id } });
  const jss2 = await prisma.class.create({ data: { schoolId: school.id, name: "JSS 2", arm: "A" } });
  const sci = await prisma.class.create({ data: { schoolId: school.id, name: "SSS 1", arm: "Science" } });
  const arts = await prisma.class.create({ data: { schoolId: school.id, name: "SSS 1", arm: "Arts" } });
  const subjects = {};
  for (const n of ["Mathematics", "English Language", "Basic Science", "Economics"]) {
    subjects[n] = await prisma.subject.create({ data: { schoolId: school.id, name: n } });
  }

  // guardians (note: two siblings share Mr Obi — the dedup story)
  const g = async (name, phone) => prisma.guardian.create({ data: { schoolId: school.id, name, phone, phoneKey: phone.replace(/\D/g, "").slice(-10) } });
  const obi = await g("Mr. Chidi Obi", "0803 111 2222");
  const bello = await g("Mrs. Halima Bello", "0805 333 4444");
  const ade = await g("Mr. Kunle Adeyemi", "0807 555 6666");

  const roster = [
    ["Amaka", "Obi", "F", jss1, obi], ["Chinedu", "Obi", "M", sci, obi], // siblings, one guardian
    ["Zainab", "Bello", "F", jss1, bello], ["Ibrahim", "Bello", "M", jss2, bello],
    ["Tola", "Adeyemi", "F", jss1, ade],
    ["Emeka", "Okafor", "M", jss1, null], ["Ngozi", "Eze", "F", jss1, null], ["Yusuf", "Sani", "M", jss1, null],
    ["Blessing", "Udoh", "F", jss2, null], ["David", "Olawale", "M", sci, null],
    ["Fatima", "Garba", "F", arts, null], ["Kelechi", "Nwankwo", "M", arts, null],
  ];
  const students = [];
  let no = 1;
  for (const [firstName, lastName, gender, klass, guardian] of roster) {
    students.push(
      await prisma.student.create({
        data: {
          schoolId: school.id, firstName, lastName, gender,
          admissionNo: `SMC-${String(no++).padStart(4, "0")}`,
          classId: klass.id,
          guardianId: guardian?.id ?? null,
          guardianName: guardian?.name ?? null,
          guardianPhone: guardian?.phone ?? null,
        },
      }),
    );
  }

  // results for JSS 1 A across 3 subjects (varied, believable)
  const jss1Kids = students.filter((s) => s.classId === jss1.id);
  const base = { Mathematics: [78, 65, 51, 44, 70, 58], "English Language": [72, 69, 55, 48, 63, 74], "Basic Science": [81, 60, 47, 52, 68, 66] };
  for (const subName of Object.keys(base)) {
    for (let i = 0; i < jss1Kids.length; i++) {
      const total = base[subName][i % base[subName].length];
      const exam = Math.round(total * 0.6), ca1 = Math.round((total - exam) / 2), ca2 = total - exam - ca1;
      await prisma.result.create({
        data: { schoolId: school.id, studentId: jss1Kids[i].id, subjectId: subjects[subName].id, classId: jss1.id, ca1, ca2, exam, total, grade: gradeFor(total), session: "2025/2026", term: "THIRD" },
      });
    }
  }

  // attendance today for JSS 1 A (one absentee)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < jss1Kids.length; i++) {
    await prisma.attendance.create({
      data: { schoolId: school.id, studentId: jss1Kids[i].id, classId: jss1.id, date: today, status: i === 3 ? "ABSENT" : "PRESENT", session: "2025/2026", term: "THIRD" },
    });
  }

  // fees: structure + invoices + payments + an expense
  const tuition = await prisma.feeItem.create({ data: { schoolId: school.id, name: "Tuition", order: 0 } });
  const books = await prisma.feeItem.create({ data: { schoolId: school.id, name: "Books", mandatory: false, order: 1 } });
  const feeOf = { [jss1.id]: 95000, [jss2.id]: 105000, [sci.id]: 145000, [arts.id]: 125000 };
  for (const [classId, amount] of Object.entries(feeOf)) {
    await prisma.classFee.create({ data: { schoolId: school.id, feeItemId: tuition.id, classId, amount } });
    await prisma.classFee.create({ data: { schoolId: school.id, feeItemId: books.id, classId, amount: 15000 } });
  }
  for (const s of students) {
    const total = (feeOf[s.classId] ?? 0) + 15000;
    const inv = await prisma.invoice.create({
      data: { schoolId: school.id, studentId: s.id, session: "2025/2026", term: "THIRD", total, lines: { create: [{ description: "Tuition", amount: total - 15000 }, { description: "Books", amount: 15000 }] } },
    });
    const roll = students.indexOf(s) % 3;
    if (roll === 0) await prisma.payment.create({ data: { schoolId: school.id, studentId: s.id, invoiceId: inv.id, amount: total, method: "TRANSFER", recordedBy: "Mrs. Funke Ojo" } });
    if (roll === 1) await prisma.payment.create({ data: { schoolId: school.id, studentId: s.id, invoiceId: inv.id, amount: Math.round(total / 2), method: "CASH", recordedBy: "Mrs. Funke Ojo" } });
  }
  await prisma.expense.create({ data: { schoolId: school.id, category: "SALARIES", description: "July payroll — teaching staff", amount: 320000, recordedBy: "Mrs. Funke Ojo" } });
  await prisma.expense.create({ data: { schoolId: school.id, category: "UTILITIES", description: "Diesel — 400L", amount: 68000, recordedBy: "Mrs. Funke Ojo" } });

  // sanity: password verifies
  const okPass = await bcrypt.compare("demo1234", hash);
  console.log(`Demo school seeded: "${school.name}" · ${students.length} students · guardians deduped (Obi x2) · password check: ${okPass ? "OK" : "FAIL"}`);
  await prisma.$disconnect();
})().catch((e) => { console.error("SEED FAILED:", e.message); process.exit(1); });
