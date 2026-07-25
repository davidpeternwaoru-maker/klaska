// Seed appraisal demo data for the Sunrise demo school:
//  1. Assign staff to departments so HOD scoping is demonstrable.
//     - Science HOD (Mrs. Funke Adeyemi) heads Science.
//     - Two teachers sit in Science (so the HOD may appraise them),
//       the rest in Arts / Commercial (so the HOD may NOT).
//  2. Clear any legacy appraisal rows (old peer/head/principal cycles).
//  3. Add a couple of sample submitted portions so the board isn't empty.
//
// Run:  node scripts/seed-appraisals.cjs
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

const env = fs.readFileSync(".env", "utf8");
const url = (env.match(/DATABASE_URL="([^"]+)"/) || [])[1];
const prisma = new PrismaClient({ datasources: { db: { url } } });

const SCHOOL_ID = "demo-sunrise";
const COMPS = ["delivery", "punctuality", "results", "planning", "management", "conduct"];

async function main() {
  const school = await prisma.school.findUnique({ where: { id: SCHOOL_ID }, select: { session: true, term: true } });
  if (!school) throw new Error("Demo school not found — run scripts/seed-demo.cjs first.");
  const session = school.session;
  const term = school.term;

  const depts = await prisma.department.findMany({ where: { schoolId: SCHOOL_ID }, orderBy: { order: "asc" } });
  const byName = Object.fromEntries(depts.map((d) => [d.name, d.id]));
  const science = byName["Science"];
  const arts = byName["Arts"];
  const commercial = byName["Commercial"];
  if (!science) throw new Error("Science department not found.");

  // 1. department assignments (idempotent)
  const assign = [
    ["stf-hod1", science], // HOD, Science
    ["stf-t2", science], // Mr. Yusuf Bello (Mathematics) → Science
    ["stf-t4", science], // Mr. Emeka Nwosu (Basic Science) → Science
    ["stf-t3", arts], // Mrs. Ngozi Eze (English) → Arts
    ["stf-t5", arts], // Mrs. Halima Aliyu (Social Studies) → Arts
    ["stf-t1", commercial], // Mrs. Adaobi Okonkwo → Commercial
    ["stf-t6", commercial], // Mr. Wale Akande (Computer) → Commercial
  ];
  for (const [staffId, departmentId] of assign) {
    await prisma.staff.updateMany({ where: { id: staffId, schoolId: SCHOOL_ID }, data: { departmentId } });
  }

  // 2. wipe legacy + prior appraisals for this cycle so the demo is clean
  await prisma.appraisal.deleteMany({ where: { schoolId: SCHOOL_ID } });

  // 3. sample portions: a submitted self + HOD for one Science teacher, and a
  //    submitted self for another, so leadership sees varied progress.
  const hod = await prisma.staff.findUnique({ where: { id: "stf-hod1" } });
  const hos = await prisma.staff.findFirst({ where: { schoolId: SCHOOL_ID, role: "HOS" } });

  async function portion(subjectId, raterRole, raterStaffId, vals, comment) {
    const overall = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
    await prisma.appraisal.create({
      data: {
        schoolId: SCHOOL_ID, subjectStaffId: subjectId, raterStaffId, raterRole, session, term,
        comment, overall, status: "SUBMITTED",
        scores: { create: COMPS.map((c, i) => ({ competency: c, score: vals[i] })) },
      },
    });
  }

  // Mr. Yusuf Bello (stf-t2): self + HOD submitted, principal pending
  await portion("stf-t2", "self", "stf-t2", [4, 5, 4, 4, 4, 5], "A strong term. My JSS Maths results improved and I kept lesson notes up to date.");
  await portion("stf-t2", "hod", hod?.id ?? null, [4, 4, 5, 4, 4, 4], "Reliable and results-driven. Could delegate more during department duties.");

  // Mr. Emeka Nwosu (stf-t4): self submitted only
  await portion("stf-t4", "self", "stf-t4", [3, 4, 3, 4, 3, 4], "Steady term; working on classroom management with the larger classes.");

  // Mrs. Ngozi Eze (stf-t3, Arts): principal submitted only (shows HOS flow)
  await portion("stf-t3", "hos", hos?.id ?? null, [4, 4, 4, 5, 4, 5], "Excellent English results and a calm, well-run classroom.");

  const counts = await prisma.appraisal.count({ where: { schoolId: SCHOOL_ID } });
  console.log("✔ Departments assigned. Science: HOD + Yusuf Bello + Emeka Nwosu.");
  console.log("✔ Sample appraisal portions created:", counts);
  console.log("  Science HOD (hod.science@sunrise.edu.ng) will see ONLY Yusuf Bello & Emeka Nwosu.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
