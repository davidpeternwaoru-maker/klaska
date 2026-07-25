// Seed the three teacher-type demo cases on the Sunrise demo school so each can
// be tested end-to-end:
//   CASE 1 — pure SUBJECT teacher: no owned class, one subject across 4 classes.
//            (teacher6@ — Mr. Wale Akande)
//   CASE 2 — pure FORM teacher: owns one class, no subject assignments.
//            (teacher5@ — Mrs. Halima Aliyu)
//   CASE 3 — BOTH: form teacher of one class + subject across several classes.
//            (teacher2@ — Mr. Yusuf Bello)
//
// Run:  node scripts/seed-teaching.cjs
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const env = fs.readFileSync(".env", "utf8");
const url = (env.match(/DATABASE_URL="([^"]+)"/) || [])[1];
const prisma = new PrismaClient({ datasources: { db: { url } } });

const SCHOOL_ID = "demo-sunrise";
const label = (c) => (c.arm ? `${c.name} ${c.arm}` : c.name);

async function main() {
  const [classes, subjects] = await Promise.all([
    prisma.class.findMany({ where: { schoolId: SCHOOL_ID }, orderBy: [{ name: "asc" }, { arm: "asc" }] }),
    prisma.subject.findMany({ where: { schoolId: SCHOOL_ID }, orderBy: { name: "asc" } }),
  ]);
  if (classes.length < 4) throw new Error("Need at least 4 classes — run seed-demo.cjs first.");
  const maths = subjects.find((s) => /math/i.test(s.name)) ?? subjects[0];
  const computer = subjects.find((s) => /computer/i.test(s.name)) ?? subjects[1] ?? subjects[0];

  const SUBJECT_ONLY = "stf-t6"; // Wale Akande
  const FORM_ONLY = "stf-t5"; // Halima Aliyu
  const BOTH = "stf-t2"; // Yusuf Bello
  const ids = [SUBJECT_ONLY, FORM_ONLY, BOTH];

  // Clean slate for these three: drop their assignments and release any class
  // they currently own (so form-teacher state is exactly what we set below).
  await prisma.teachingAssignment.deleteMany({ where: { schoolId: SCHOOL_ID, teacherId: { in: ids } } });
  await prisma.class.updateMany({ where: { schoolId: SCHOOL_ID, teacherId: { in: ids } }, data: { teacherId: null } });

  const c0 = classes[0], c1 = classes[1], c2 = classes[2], c3 = classes[3];

  // CASE 1 — subject-only: Computer in 4 classes, owns nothing.
  await prisma.teachingAssignment.createMany({
    data: [c0, c1, c2, c3].map((c) => ({ schoolId: SCHOOL_ID, teacherId: SUBJECT_ONLY, subjectId: computer.id, classId: c.id })),
    skipDuplicates: true,
  });

  // CASE 2 — form-only: owns c0, no subject assignments.
  await prisma.class.update({ where: { id: c0.id }, data: { teacherId: FORM_ONLY } });

  // CASE 3 — both: owns c1 + teaches Maths in c1, c2, c3.
  await prisma.class.update({ where: { id: c1.id }, data: { teacherId: BOTH } });
  await prisma.teachingAssignment.createMany({
    data: [c1, c2, c3].map((c) => ({ schoolId: SCHOOL_ID, teacherId: BOTH, subjectId: maths.id, classId: c.id })),
    skipDuplicates: true,
  });

  console.log("✔ Teaching demo seeded on", SCHOOL_ID);
  console.log(`  Subject: ${computer.name} (case 1), ${maths.name} (case 3)`);
  console.log(`  CASE 1 teacher6@ (subject only): ${computer.name} in ${[c0, c1, c2, c3].map(label).join(", ")} — owns NO class`);
  console.log(`  CASE 2 teacher5@ (form only): form teacher of ${label(c0)} — NO subjects`);
  console.log(`  CASE 3 teacher2@ (both): form teacher of ${label(c1)} + ${maths.name} in ${[c1, c2, c3].map(label).join(", ")}`);
  console.log(`  class ids → c0=${c0.id} c1=${c1.id} c2=${c2.id} c3=${c3.id}`);
  console.log(`  subject ids → computer=${computer.id} maths=${maths.id}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
