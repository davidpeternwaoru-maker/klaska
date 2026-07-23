// Adds multi-year academic HISTORY to the Sunrise demo so official transcripts
// are real, multi-page documents. Idempotent: safe to run repeatedly.
//
// For every student it walks the cohort back through prior levels/sessions
// (e.g. an SSS3 student gets SSS1 → SSS2 → SSS3 across three sessions), plus
// fills the current session's First & Second terms. Cohorts move together, so
// positions computed per (class, session, term) are real. Scores trend upward
// over time so "most improved" is meaningful for the analysis rebuild.

const { PrismaClient } = require("@prisma/client");
const { readFileSync } = require("fs");
const { join } = require("path");

function parseEnv() {
  const out = {};
  const raw = readFileSync(join(__dirname, "..", ".env"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "").replace(/\r$/, "");
  }
  return out;
}
const env = parseEnv();
process.env.DATABASE_URL = env.DATABASE_URL;
process.env.DIRECT_URL = env.DIRECT_URL;
const prisma = new PrismaClient();

const SCHOOL_ID = "demo-sunrise";
const CURRENT_SESSION = "2025/2026";
const TERMS = ["FIRST", "SECOND", "THIRD"];
const TERM_STEP = { FIRST: 0, SECOND: 1, THIRD: 2 };

const backSession = (session, years) => {
  const [a, b] = session.split("/").map(Number);
  return `${a - years}/${b - years}`;
};
// deterministic 0..1 from a string
function rand(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

async function main() {
  const [bands, levels, classes, students] = await Promise.all([
    prisma.gradingBand.findMany({ where: { schoolId: SCHOOL_ID } }),
    prisma.level.findMany({ where: { schoolId: SCHOOL_ID }, orderBy: { order: "asc" } }),
    prisma.class.findMany({ where: { schoolId: SCHOOL_ID }, include: { level: true } }),
    prisma.student.findMany({ where: { schoolId: SCHOOL_ID }, include: { class: { include: { level: true } } } }),
  ]);
  if (!levels.length) return console.log("No levels — run the main seed first.");

  const gradeFor = (cat, total) => {
    const b = bands.filter((x) => x.category === cat).find((x) => total >= x.minScore && total <= x.maxScore);
    return b ? b.label : null;
  };
  const catOf = (section) => (section === "SENIOR" || section === "JUNIOR" ? "SECONDARY" : section === "PRIMARY" ? "PRIMARY" : "EARLY");
  // classId lookup by level order (+ arm preference)
  const classByOrderArm = (order, arm) => {
    const inLevel = classes.filter((c) => c.level && c.level.order === order);
    if (!inLevel.length) return null;
    return (inLevel.find((c) => c.arm === arm) || inLevel[0]).id;
  };

  let rows = 0;
  const ops = [];
  const gradYear = [];

  for (const st of students) {
    const cls = st.class;
    if (!cls || !cls.level) continue;
    const section = cls.level.section;
    const cat = catOf(section);
    const curOrder = cls.level.order;

    const existing = await prisma.result.findMany({ where: { schoolId: SCHOOL_ID, studentId: st.id }, select: { subjectId: true } });
    const subjectIds = [...new Set(existing.map((r) => r.subjectId))];
    if (!subjectIds.length) continue;

    // Timeline of (session, term, classId, stepIndex) — earlier = lower level + lower scores.
    const timeline = [];
    let step = 0;
    // two prior sessions at lower levels (only within the same section)
    for (const back of [2, 1]) {
      const lower = levels.find((l) => l.section === section && l.order === curOrder - back);
      if (!lower) continue;
      const session = backSession(CURRENT_SESSION, back);
      const classId = classByOrderArm(lower.order, cls.arm) || cls.id;
      for (const term of TERMS) timeline.push({ session, term, classId, step: step + TERM_STEP[term] });
      step += 3;
    }
    // current session First & Second (Third already seeded)
    for (const term of ["FIRST", "SECOND"]) timeline.push({ session: CURRENT_SESSION, term, classId: cls.id, step: step + TERM_STEP[term] });

    for (const t of timeline) {
      for (const subjectId of subjectIds) {
        const base = 52 + Math.floor(rand(st.id + subjectId) * 34); // 52..86 ability
        const trend = t.step * 1.4; // improve over time
        const noise = rand(st.id + subjectId + t.session + t.term) * 8 - 4;
        const total = Math.round(clamp(base + trend + noise, 33, 98));
        const ca1 = Math.round(total * 0.2);
        const ca2 = Math.round(total * 0.2);
        const exam = total - ca1 - ca2;
        ops.push(
          prisma.result.upsert({
            where: { studentId_subjectId_session_term: { studentId: st.id, subjectId, session: t.session, term: t.term } },
            create: { schoolId: SCHOOL_ID, studentId: st.id, subjectId, classId: t.classId, ca1, ca2, exam, total, grade: gradeFor(cat, total), session: t.session, term: t.term },
            update: { classId: t.classId, ca1, ca2, exam, total, grade: gradeFor(cat, total) },
          }),
        );
        rows++;
      }
    }

    // Admission date ~ (years in school) before now; a few top-level seniors graduate.
    const yearsIn = timeline.length ? 3 : 1;
    const admittedAt = new Date(2026 - yearsIn, 8, 12); // mid-September
    const topSenior = section === "SENIOR" && curOrder === Math.max(...levels.filter((l) => l.section === "SENIOR").map((l) => l.order));
    const graduate = topSenior && rand(st.id) > 0.45;
    ops.push(
      prisma.student.update({
        where: { id: st.id },
        data: {
          admittedAt,
          ...(graduate ? { status: "GRADUATED", statusChangedAt: new Date(2026, 6, 15), statusReason: "Completed final year" } : {}),
        },
      }),
    );
    if (graduate) gradYear.push(st.id);
  }

  // run in chunks so we don't open thousands of statements at once
  for (let i = 0; i < ops.length; i += 40) {
    await prisma.$transaction(ops.slice(i, i + 40));
    process.stdout.write(`\r  writing… ${Math.min(i + 40, ops.length)}/${ops.length}`);
  }
  console.log(`\n✔ history seeded — ${rows} result rows across sessions/terms; ${gradYear.length} students graduated.`);
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
