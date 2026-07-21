/* ─────────────────────────────────────────────────────────────────────────────
 * Klaska demo seed — one complete, realistic Nigerian school, straight into the DB.
 *
 * Idempotent: deletes the demo school (fixed id) and rebuilds it, so you can run
 * it as often as you like. Populates BOTH the legacy columns the current screens
 * read (School.session/term, Result.ca1/ca2/exam) AND the new Phase-1 tables
 * (Session/Term/Level/Department/Assessment/Score/…), so nothing breaks while we
 * migrate screens onto the new model.
 *
 * Run:  node scripts/seed-demo.cjs
 * Then log in at /login with a printed credential.
 * ──────────────────────────────────────────────────────────────────────────── */
const fs = require("fs");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

function parseEnv(txt) {
  const out = {};
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}
const url = parseEnv(fs.readFileSync(".env", "utf8")).DATABASE_URL || "";
if (!/^postgres(ql)?:\/\//.test(url)) {
  console.error("Could not read a valid DATABASE_URL from .env (got " + url.length + " chars). Check the .env line looks like DATABASE_URL=\"postgresql://…\".");
  process.exit(1);
}
const prisma = new PrismaClient({ datasources: { db: { url } } });

const SCHOOL_ID = "demo-sunrise";
const SESSION = "2025/2026";
const TERM = "THIRD"; // current term
const DOMAIN = "sunrise.edu.ng";
const PASSWORD = "klaska123";

// deterministic RNG so re-seeds are stable
function mulberry32(a) { return function () { let t = (a += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rng = mulberry32(20260721);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const ri = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

const FIRST_F = ["Adaeze","Chinwe","Ngozi","Ifeoma","Amaka","Uche","Nneka","Aisha","Halima","Zainab","Fatima","Amina","Esther","Grace","Faith","Blessing","Kamsi","Tari","Funmi","Yewande"];
const FIRST_M = ["Tunde","Femi","Segun","Wale","Tobi","Kunle","Emeka","Chika","Obinna","Ikenna","Yusuf","Ibrahim","Musa","Aliyu","Sani","Kabir","Daniel","David","Joshua","Samuel"];
const LAST = ["Okonkwo","Adeyemi","Bello","Eze","Adekunle","Nwosu","Aliyu","Obi","Suleiman","Akande","Okafor","Balogun","Adebayo","Ojo","Lawal","Yakubu","Mohammed","Sanusi","Nnaji","Okoro","Bankole","Williams","Edet","Akpan","Garba"];
const RELATIONS = ["Mother","Father","Guardian","Aunt","Uncle"];

const LEVELS = [
  { name: "Primary 1", section: "PRIMARY" }, { name: "Primary 2", section: "PRIMARY" }, { name: "Primary 3", section: "PRIMARY" },
  { name: "Primary 4", section: "PRIMARY" }, { name: "Primary 5", section: "PRIMARY" }, { name: "Primary 6", section: "PRIMARY" },
  { name: "JSS 1", section: "JUNIOR" }, { name: "JSS 2", section: "JUNIOR" }, { name: "JSS 3", section: "JUNIOR" },
  { name: "SSS 1", section: "SENIOR" }, { name: "SSS 2", section: "SENIOR" }, { name: "SSS 3", section: "SENIOR" },
];
// which levels get a second arm (B)
const TWO_ARMS = new Set(["JSS 1", "SSS 1"]);
const DEPARTMENTS = ["Science", "Arts", "Commercial"];
const SUBJECTS = ["English Language","Mathematics","Basic Science","Social Studies","Civic Education","Computer Studies","Agricultural Science","Business Studies"];
const TOPICS = {
  "Mathematics": ["Number & Numeration","Fractions & Decimals","Algebraic Processes","Geometry","Statistics","Measurement"],
  "English Language": ["Comprehension","Grammar","Vocabulary Development","Essay Writing","Oral English","Summary"],
};
const ASSESSMENTS = [
  { id: "as-ca1", name: "CA1", maxScore: 20, weight: 20, order: 0, category: "CA" },
  { id: "as-ca2", name: "CA2", maxScore: 20, weight: 20, order: 1, category: "CA" },
  { id: "as-exam", name: "Exam", maxScore: 60, weight: 60, order: 2, category: "EXAM" },
];
const SEC_BANDS = [["A1",75,100,"Excellent"],["B2",70,74,"Very good"],["B3",65,69,"Good"],["C4",60,64,"Credit"],["C5",55,59,"Credit"],["C6",50,54,"Credit"],["D7",45,49,"Pass"],["E8",40,44,"Pass"],["F9",0,39,"Fail"]];
const PRI_BANDS = [["A",70,100,"Excellent"],["B",60,69,"Very good"],["C",50,59,"Credit"],["D",40,49,"Pass"],["E",0,39,"Needs improvement"]];
const gradeFor = (total, section) => {
  const bands = section === "PRIMARY" ? PRI_BANDS : SEC_BANDS;
  const b = bands.find((x) => total >= x[1] && total <= x[2]);
  return b ? b[0] : "-";
};
const FEE_BY_SECTION = { PRIMARY: 90000, JUNIOR: 130000, SENIOR: 160000 };
const FEE_ITEMS = [
  { id: "fee-tuition", name: "Tuition", mandatory: true, share: 0.7 },
  { id: "fee-dev", name: "Development levy", mandatory: true, share: 0.2 },
  { id: "fee-exam", name: "Examination fee", mandatory: true, share: 0.1 },
];

function money(n) { return "₦" + n.toLocaleString("en-NG"); }

async function main() {
  console.log("Seeding demo school…");
  // 1. wipe (cascade) and recreate the school
  await prisma.school.deleteMany({ where: { id: SCHOOL_ID } });
  const now = new Date();
  await prisma.school.create({
    data: {
      id: SCHOOL_ID, name: "Sunrise Model College", shortName: "SMC",
      motto: "Knowledge and Character", address: "14 Awolowo Way, Ikeja, Lagos",
      email: "admin@" + DOMAIN, phone: "0801 234 5678",
      sections: ["PRIMARY", "JUNIOR", "SENIOR"], setupCompletedAt: now,
      session: SESSION, term: TERM,
      termStart: new Date(2026, 3, 27), termEnd: new Date(2026, 6, 24),
      feeCollection: "MANUAL", tier: "ENTERPRISE",
    },
  });

  // 2. session + terms
  await prisma.session.create({ data: { id: "demo-sess", schoolId: SCHOOL_ID, name: SESSION, isCurrent: true, startDate: new Date(2025, 8, 15), endDate: new Date(2026, 6, 24) } });
  await prisma.term.createMany({ data: [
    { id: "demo-t1", schoolId: SCHOOL_ID, sessionId: "demo-sess", name: "FIRST", isCurrent: false },
    { id: "demo-t2", schoolId: SCHOOL_ID, sessionId: "demo-sess", name: "SECOND", isCurrent: false },
    { id: "demo-t3", schoolId: SCHOOL_ID, sessionId: "demo-sess", name: "THIRD", isCurrent: true, startDate: new Date(2026, 3, 27), endDate: new Date(2026, 6, 24) },
  ] });
  const CURRENT_TERM_ID = "demo-t3";

  // 3. levels + departments
  await prisma.level.createMany({ data: LEVELS.map((l, i) => ({ id: "lvl-" + i, schoolId: SCHOOL_ID, name: l.name, section: l.section, order: i })) });
  const levelIdByName = Object.fromEntries(LEVELS.map((l, i) => [l.name, "lvl-" + i]));
  await prisma.department.createMany({ data: DEPARTMENTS.map((d, i) => ({ id: "dept-" + i, schoolId: SCHOOL_ID, name: d, order: i })) });
  const deptIds = DEPARTMENTS.map((_, i) => "dept-" + i);

  // 4. subjects, assessments, topics, grading bands, fee items
  await prisma.subject.createMany({ data: SUBJECTS.map((s, i) => ({ id: "sub-" + i, schoolId: SCHOOL_ID, name: s })) });
  const subjectIds = SUBJECTS.map((_, i) => "sub-" + i);
  const subIdByName = Object.fromEntries(SUBJECTS.map((s, i) => [s, "sub-" + i]));
  await prisma.assessment.createMany({ data: ASSESSMENTS.map((a) => ({ ...a, schoolId: SCHOOL_ID })) });

  const topicRows = [];
  let tI = 0;
  for (const [subj, topics] of Object.entries(TOPICS)) {
    const sid = subIdByName[subj];
    topics.forEach((name, order) => topicRows.push({ id: "top-" + tI++, schoolId: SCHOOL_ID, subjectId: sid, name, section: "JUNIOR", order }));
  }
  await prisma.curriculumTopic.createMany({ data: topicRows });
  const topicsBySubject = {};
  topicRows.forEach((t) => { (topicsBySubject[t.subjectId] = topicsBySubject[t.subjectId] || []).push(t.id); });

  await prisma.gradingBand.createMany({ data: [
    ...SEC_BANDS.map((b, i) => ({ schoolId: SCHOOL_ID, category: "SECONDARY", label: b[0], minScore: b[1], maxScore: b[2], remark: b[3], order: i })),
    ...PRI_BANDS.map((b, i) => ({ schoolId: SCHOOL_ID, category: "PRIMARY", label: b[0], minScore: b[1], maxScore: b[2], remark: b[3], order: i })),
  ] });
  await prisma.feeItem.createMany({ data: FEE_ITEMS.map((f, i) => ({ id: f.id, schoolId: SCHOOL_ID, name: f.name, mandatory: f.mandatory, order: i })) });

  // 5. staff (all share the demo password)
  const hash = await bcrypt.hash(PASSWORD, 10);
  const STAFF = [
    { id: "stf-owner", name: "Mrs. Ifeoma Okeke", email: "owner@" + DOMAIN, role: "OWNER", title: "Proprietor", salary: 520000 },
    { id: "stf-hos", name: "Mr. Tunde Bakare", email: "principal@" + DOMAIN, role: "HOS", title: "Principal", salary: 450000 },
    { id: "stf-bursar", name: "Mr. Chuka Obi", email: "bursar@" + DOMAIN, role: "BURSAR", title: "Bursar", salary: 400000 },
    { id: "stf-hod1", name: "Mrs. Funke Adeyemi", email: "hod.science@" + DOMAIN, role: "HOD", title: "HOD, Science", salary: 360000 },
    { id: "stf-admin", name: "Mrs. Bisi Adekunle", email: "admin.office@" + DOMAIN, role: "ADMIN", title: "Admin Officer", salary: 200000 },
    { id: "stf-t1", name: "Mrs. Adaobi Okonkwo", email: "teacher1@" + DOMAIN, role: "TEACHER", title: "Class Teacher", salary: 240000 },
    { id: "stf-t2", name: "Mr. Yusuf Bello", email: "teacher2@" + DOMAIN, role: "TEACHER", title: "Mathematics", salary: 250000 },
    { id: "stf-t3", name: "Mrs. Ngozi Eze", email: "teacher3@" + DOMAIN, role: "TEACHER", title: "English", salary: 245000 },
    { id: "stf-t4", name: "Mr. Emeka Nwosu", email: "teacher4@" + DOMAIN, role: "TEACHER", title: "Basic Science", salary: 250000 },
    { id: "stf-t5", name: "Mrs. Halima Aliyu", email: "teacher5@" + DOMAIN, role: "TEACHER", title: "Social Studies", salary: 235000 },
    { id: "stf-t6", name: "Mr. Wale Akande", email: "teacher6@" + DOMAIN, role: "TEACHER", title: "Computer Studies", salary: 248000 },
  ];
  await prisma.staff.createMany({ data: STAFF.map((s) => ({ id: s.id, schoolId: SCHOOL_ID, name: s.name, email: s.email, passwordHash: hash, role: s.role, title: s.title, salaryMonthly: s.salary })) });
  const teacherIds = STAFF.filter((s) => s.role === "TEACHER").map((s) => s.id);

  // 6. classes (level + arm), with a class teacher; senior classes get a department
  const classes = [];
  let cI = 0, tAssign = 0;
  for (const lvl of LEVELS) {
    const arms = TWO_ARMS.has(lvl.name) ? ["A", "B"] : ["A"];
    for (const arm of arms) {
      const isSenior = lvl.section === "SENIOR";
      classes.push({
        id: "cls-" + cI++, schoolId: SCHOOL_ID, name: lvl.name, arm,
        levelId: levelIdByName[lvl.name], teacherId: teacherIds[tAssign++ % teacherIds.length],
        departmentId: isSenior ? deptIds[(cI) % deptIds.length] : null,
        section: lvl.section,
      });
    }
  }
  await prisma.class.createMany({ data: classes.map((c) => ({ id: c.id, schoolId: c.schoolId, name: c.name, arm: c.arm, levelId: c.levelId, teacherId: c.teacherId, departmentId: c.departmentId })) });

  // 7. class fees (per-item amounts by section)
  const classFees = [];
  for (const c of classes) {
    const total = FEE_BY_SECTION[c.section];
    for (const f of FEE_ITEMS) classFees.push({ schoolId: SCHOOL_ID, feeItemId: f.id, classId: c.id, amount: Math.round(total * f.share) });
  }
  await prisma.classFee.createMany({ data: classFees });

  // 8. students + guardians (+ a few graduated/left for lifecycle), enrollments, events
  const students = [];
  const guardians = [];
  let sI = 0, gI = 0, admYear = 2019;
  for (const c of classes) {
    const n = ri(4, 6);
    for (let k = 0; k < n; k++) {
      const gender = rng() > 0.5 ? "F" : "M";
      const first = pick(gender === "F" ? FIRST_F : FIRST_M);
      const last = pick(LAST);
      const gid = "grd-" + gI++;
      guardians.push({ id: gid, schoolId: SCHOOL_ID, name: (rng() > 0.5 ? "Mrs. " : "Mr. ") + pick([...FIRST_F, ...FIRST_M]) + " " + last, phone: "080" + ri(10000000, 99999999), phoneKey: null, email: (first + "." + last).toLowerCase() + "@gmail.com" });
      // status: most active; a handful graduated (SSS 3) or left
      let status = "ACTIVE";
      if (c.name === "SSS 3" && rng() > 0.7) status = "GRADUATED";
      else if (rng() > 0.96) status = "LEFT";
      const sid = "stu-" + sI++;
      students.push({
        id: sid, schoolId: SCHOOL_ID, firstName: first, lastName: last, gender,
        admissionNo: "SMC-" + admYear + "-" + String(1000 + sI),
        dob: new Date(ri(2008, 2019), ri(0, 11), ri(1, 28)),
        guardianId: gid, guardianName: guardians[guardians.length - 1].name, guardianPhone: guardians[guardians.length - 1].phone,
        classId: c.id, status,
        statusReason: status === "LEFT" ? pick(["Relocation", "Transfer", "Financial"]) : null,
        statusChangedAt: status === "ACTIVE" ? null : now,
        departmentId: c.departmentId,
        _class: c,
      });
    }
  }
  await prisma.guardian.createMany({ data: guardians });
  await prisma.student.createMany({ data: students.map((s) => ({ id: s.id, schoolId: s.schoolId, firstName: s.firstName, lastName: s.lastName, gender: s.gender, admissionNo: s.admissionNo, dob: s.dob, guardianId: s.guardianId, guardianName: s.guardianName, guardianPhone: s.guardianPhone, classId: s.classId, status: s.status, statusReason: s.statusReason, statusChangedAt: s.statusChangedAt, departmentId: s.departmentId })) });
  await prisma.enrollment.createMany({ data: students.map((s) => ({ schoolId: SCHOOL_ID, studentId: s.id, classId: s.classId, sessionId: "demo-sess", startedAt: new Date(2025, 8, 15) })) });
  await prisma.studentEvent.createMany({ data: students.flatMap((s) => {
    const evs = [{ schoolId: SCHOOL_ID, studentId: s.id, type: "ENROLLED", session: SESSION, term: "FIRST", note: "Admitted into " + s._class.name, createdAt: new Date(2025, 8, 15) }];
    if (s.status === "GRADUATED") evs.push({ schoolId: SCHOOL_ID, studentId: s.id, type: "GRADUATED", session: SESSION, term: TERM, note: "Completed SSS 3", createdAt: now });
    if (s.status === "LEFT") evs.push({ schoolId: SCHOOL_ID, studentId: s.id, type: "LEFT", session: SESSION, term: TERM, note: s.statusReason, createdAt: now });
    return evs;
  }) });

  // 9. scores (new) + results (legacy) for active/graduated students, current term
  const scoreRows = [];
  const resultRows = [];
  const scored = students.filter((s) => s.status !== "LEFT");
  for (const s of scored) {
    for (const subId of subjectIds) {
      const ca1 = ri(6, 20), ca2 = ri(6, 20), exam = ri(24, 60);
      const total = ca1 + ca2 + exam;
      const topic = topicsBySubject[subId] ? pick(topicsBySubject[subId]) : null;
      scoreRows.push(
        { schoolId: SCHOOL_ID, studentId: s.id, subjectId: subId, assessmentId: "as-ca1", termId: CURRENT_TERM_ID, topicId: topic, value: ca1, session: SESSION, termLabel: TERM },
        { schoolId: SCHOOL_ID, studentId: s.id, subjectId: subId, assessmentId: "as-ca2", termId: CURRENT_TERM_ID, topicId: topic, value: ca2, session: SESSION, termLabel: TERM },
        { schoolId: SCHOOL_ID, studentId: s.id, subjectId: subId, assessmentId: "as-exam", termId: CURRENT_TERM_ID, topicId: topic, value: exam, session: SESSION, termLabel: TERM },
      );
      resultRows.push({ schoolId: SCHOOL_ID, studentId: s.id, subjectId: subId, classId: s.classId, ca1, ca2, exam, total, grade: gradeFor(total, s._class.section), session: SESSION, term: TERM });
    }
  }
  // batch inserts (Neon is fine with a few thousand rows; chunk to be safe)
  const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
  for (const c of chunk(scoreRows, 500)) await prisma.score.createMany({ data: c });
  for (const c of chunk(resultRows, 500)) await prisma.result.createMany({ data: c });

  // 10. attendance — last 10 weekdays for active students
  const attRows = [];
  const days = [];
  let d = new Date(now); let count = 0;
  while (days.length < 10) { d.setDate(d.getDate() - 1); const dow = d.getDay(); if (dow !== 0 && dow !== 6) days.push(new Date(d)); if (++count > 30) break; }
  for (const s of students.filter((x) => x.status === "ACTIVE")) {
    for (const day of days) {
      const r = rng(); const status = r > 0.9 ? "ABSENT" : r > 0.82 ? "LATE" : "PRESENT";
      attRows.push({ schoolId: SCHOOL_ID, studentId: s.id, classId: s.classId, date: new Date(day.getFullYear(), day.getMonth(), day.getDate()), status, session: SESSION, term: TERM });
    }
  }
  for (const c of chunk(attRows, 500)) await prisma.attendance.createMany({ data: c });

  // 11. invoices + lines + payments + receipts (current term)
  let payI = 0, rcpI = 0;
  const active = students.filter((s) => s.status === "ACTIVE");
  for (const s of active) {
    const total = FEE_BY_SECTION[s._class.section];
    const inv = await prisma.invoice.create({ data: {
      schoolId: SCHOOL_ID, studentId: s.id, session: SESSION, term: TERM, total,
      lines: { create: FEE_ITEMS.map((f) => ({ description: f.name, amount: Math.round(total * f.share) })) },
    } });
    const r = rng();
    let paid = 0;
    if (r > 0.4) paid = total;            // ~60% fully paid
    else if (r > 0.15) paid = Math.round(total * pick([0.3, 0.5, 0.6])); // ~25% partial
    // else unpaid
    if (paid > 0) {
      const pay = await prisma.payment.create({ data: { schoolId: SCHOOL_ID, studentId: s.id, invoiceId: inv.id, amount: paid, method: pick(["CASH", "TRANSFER", "POS"]), reference: "TRX" + ri(100000, 999999), recordedBy: "Mr. Chuka Obi" } });
      await prisma.receipt.create({ data: { schoolId: SCHOOL_ID, paymentId: pay.id, number: "RCP-" + String(1000 + rcpI++) } });
      payI++;
    }
  }

  // 12. expenses (this term)
  await prisma.expense.createMany({ data: [
    { schoolId: SCHOOL_ID, category: "SALARIES", description: "Staff salaries — June", amount: STAFF.reduce((a, s) => a + s.salary, 0), spentAt: new Date(2026, 5, 1) },
    { schoolId: SCHOOL_ID, category: "UTILITIES", description: "Diesel & power (PowerGen Ltd)", amount: 640000, spentAt: new Date(2026, 5, 4) },
    { schoolId: SCHOOL_ID, category: "MAINTENANCE", description: "Repairs & maintenance", amount: 210000, spentAt: new Date(2026, 5, 8) },
    { schoolId: SCHOOL_ID, category: "SUPPLIES", description: "Office & class supplies", amount: 175000, spentAt: new Date(2026, 5, 10) },
    { schoolId: SCHOOL_ID, category: "RENT", description: "Premises rent (quarter)", amount: 900000, spentAt: new Date(2026, 4, 1) },
    { schoolId: SCHOOL_ID, category: "TRANSPORT", description: "School bus diesel", amount: 130000, spentAt: new Date(2026, 5, 12) },
  ] });

  // summary
  const counts = {
    students: await prisma.student.count({ where: { schoolId: SCHOOL_ID } }),
    active: await prisma.student.count({ where: { schoolId: SCHOOL_ID, status: "ACTIVE" } }),
    staff: await prisma.staff.count({ where: { schoolId: SCHOOL_ID } }),
    classes: await prisma.class.count({ where: { schoolId: SCHOOL_ID } }),
    scores: await prisma.score.count({ where: { schoolId: SCHOOL_ID } }),
    results: await prisma.result.count({ where: { schoolId: SCHOOL_ID } }),
    attendance: await prisma.attendance.count({ where: { schoolId: SCHOOL_ID } }),
    payments: await prisma.payment.count({ where: { schoolId: SCHOOL_ID } }),
  };
  console.log("\n✅ Seeded Sunrise Model College");
  console.log("   students:", counts.students, "(active " + counts.active + ") · staff:", counts.staff, "· classes:", counts.classes);
  console.log("   scores:", counts.scores, "· results:", counts.results, "· attendance:", counts.attendance, "· payments:", counts.payments);
  console.log("\n   Log in at /login:");
  console.log("     owner@" + DOMAIN + "      (Owner)     /", PASSWORD);
  console.log("     principal@" + DOMAIN + "  (Principal) /", PASSWORD);
  console.log("     bursar@" + DOMAIN + "     (Bursar)    /", PASSWORD);
  console.log("     teacher1@" + DOMAIN + "   (Teacher)   /", PASSWORD);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error("SEED FAILED:", e); await prisma.$disconnect(); process.exit(1); });
