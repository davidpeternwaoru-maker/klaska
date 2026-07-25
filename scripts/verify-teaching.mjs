// End-to-end RBAC verification for the three teacher types. Mints a session per
// teacher, hits /api/tteach, asserts each sees/edits EXACTLY what they should,
// then cleans up the probe-written rows. Dev server must be on :3000.
// Run:  node scripts/verify-teaching.mjs
import fs from "node:fs";
import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";

const env = fs.readFileSync(".env", "utf8");
const secret = new TextEncoder().encode((env.match(/AUTH_SECRET="?([^"\n]+)"?/) || [])[1]);
const dbUrl = (env.match(/DATABASE_URL="([^"]+)"/) || [])[1];
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
const SCHOOL = "demo-sunrise";

const tok = (id, role) => new SignJWT({ staffId: id, schoolId: SCHOOL, role, name: id, email: id + "@x", setupComplete: true }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);
async function probe(id, role, qs) {
  const t = await tok(id, role);
  return (await fetch("http://localhost:3000/api/tteach?" + qs, { headers: { cookie: "klaska_session=" + t } })).json();
}
let all = true;
const P = (label, ok, got) => { console.log(`${ok ? "PASS" : "FAIL"}  ${label}  →  ${JSON.stringify(got)}`); all = ok && all; };

const T6 = "stf-t6" /*subject-only*/, T5 = "stf-t5" /*form-only*/, T2 = "stf-t2" /*both*/;
// From seed-teaching: c0=cls-6 JSS1A, c1=cls-7 JSS1B, c2=cls-8 JSS2A, c3=cls-9 JSS3A
const C0 = "cls-6", C1 = "cls-7", C2 = "cls-8", C3 = "cls-9";
const COMPUTER = "sub-5", MATHS = "sub-1";
// a class none of the demo cases teach (for negative tests)
const otherClass = (await prisma.class.findFirst({ where: { schoolId: SCHOOL, id: { notIn: [C0, C1, C2, C3] } }, select: { id: true } }))?.id;
const firstStudent = async (cls) => (await prisma.student.findFirst({ where: { schoolId: SCHOOL, classId: cls }, select: { id: true } }))?.id;
const sC0 = await firstStudent(C0), sC1 = await firstStudent(C1), sC2 = await firstStudent(C2);

console.log("\n===== CASE 1 — pure SUBJECT teacher (teacher6, Computer in 4 classes, owns none) =====");
{
  const g = await probe(T6, "TEACHER", "probe=grid");
  P("Score-entry lists ONLY the 4 taught classes", g.classes?.length === 4, g);
  P("Subjects in first class = Computer only", JSON.stringify(g.subjects) === JSON.stringify(["Computer Studies"]), g.subjects);
  P("Enter Computer in a taught class → allowed", (await probe(T6, "TEACHER", `probe=savescore&subjectId=${COMPUTER}&classId=${C0}&studentId=${sC0}`)).wrote >= 1, "");
  P("Enter MATHS (not their subject) in a taught class → DENIED", !!(await probe(T6, "TEACHER", `probe=savescore&subjectId=${MATHS}&classId=${C0}&studentId=${sC0}`)).denied, "");
  P("Enter Computer in a class they DON'T teach → DENIED", !!(await probe(T6, "TEACHER", `probe=savescore&subjectId=${COMPUTER}&classId=${otherClass}&studentId=${await firstStudent(otherClass)}`)).denied, "");
  const m = await probe(T6, "TEACHER", "probe=marker");
  P("Attendance marker lists the 4 taught classes", m.classes?.length === 4, m);
  P("Mark register for a class they DON'T teach → DENIED", !!(await probe(T6, "TEACHER", `probe=attmark&classId=${otherClass}&studentId=${await firstStudent(otherClass)}`)).denied, "");
  const rc = await probe(T6, "TEACHER", "probe=reportcards");
  P("Report cards: owns no class → none to compile", rc.classes?.length === 0, rc);
  const st = await probe(T6, "TEACHER", "probe=students");
  P("Students: only those in the 4 taught classes", st.classes?.length === 4, st);
}

console.log("\n===== CASE 2 — pure FORM teacher (teacher5, owns JSS1A, no subjects) =====");
{
  const g = await probe(T5, "TEACHER", "probe=grid");
  P("Score entry: NO classes (no subject assignments)", g.classes?.length === 0, g);
  P("Enter scores anywhere (even owned class) → DENIED", !!(await probe(T5, "TEACHER", `probe=savescore&subjectId=${MATHS}&classId=${C0}&studentId=${sC0}`)).denied, "");
  const m = await probe(T5, "TEACHER", "probe=marker");
  P("Attendance marker = their owned class only (JSS1A)", JSON.stringify(m.classes) === JSON.stringify(["JSS 1 A"]), m);
  P("Mark their OWN class register → allowed", (await probe(T5, "TEACHER", `probe=attmark&classId=${C0}&studentId=${sC0}`)).wrote >= 1, "");
  P("Mark a class they don't own → DENIED", !!(await probe(T5, "TEACHER", `probe=attmark&classId=${C1}&studentId=${sC1}`)).denied, "");
  const rc = await probe(T5, "TEACHER", "probe=reportcards");
  P("Report cards: their owned class (JSS1A)", JSON.stringify(rc.classes) === JSON.stringify(["JSS 1 A"]), rc);
  P("Class-teacher remark for OWN class student → allowed", !!(await probe(T5, "TEACHER", `probe=classremark&studentId=${sC0}`)).wrote, "");
  P("Class-teacher remark for another class's student → DENIED", !!(await probe(T5, "TEACHER", `probe=classremark&studentId=${sC1}`)).denied, "");
}

console.log("\n===== CASE 3 — BOTH (teacher2, form teacher of JSS1B + Maths in JSS1B/2A/3A) =====");
{
  const g = await probe(T2, "TEACHER", "probe=grid");
  P("Score entry lists the 3 taught classes", g.classes?.length === 3, g);
  P("Enter Maths in a taught class → allowed", (await probe(T2, "TEACHER", `probe=savescore&subjectId=${MATHS}&classId=${C1}&studentId=${sC1}`)).wrote >= 1, "");
  P("Enter Maths in a class they don't teach → DENIED", !!(await probe(T2, "TEACHER", `probe=savescore&subjectId=${MATHS}&classId=${C0}&studentId=${sC0}`)).denied, "");
  const m = await probe(T2, "TEACHER", "probe=marker");
  P("Attendance marker = owned ∪ taught (3 classes incl. JSS1B)", m.classes?.length === 3 && m.classes.includes("JSS 1 B"), m);
  const rc = await probe(T2, "TEACHER", "probe=reportcards");
  P("Report cards: ONLY their owned class (JSS1B)", JSON.stringify(rc.classes) === JSON.stringify(["JSS 1 B"]), rc);
  P("Class remark for OWNED-class student → allowed", !!(await probe(T2, "TEACHER", `probe=classremark&studentId=${sC1}`)).wrote, "");
  P("Class remark for a class they only TEACH (not own) → DENIED", !!(await probe(T2, "TEACHER", `probe=classremark&studentId=${sC2}`)).denied, "");
}

// ---- cleanup probe-written rows ----
const delR = await prisma.result.deleteMany({ where: { schoolId: SCHOOL, subjectRemark: "probe" } });
const delRR = await prisma.reportRemark.deleteMany({ where: { schoolId: SCHOOL, classTeacherRemark: "probe remark" } });
const delA = await prisma.attendance.deleteMany({ where: { schoolId: SCHOOL, recordedBy: { in: [T6, T5, T2] }, date: new Date(new Date().toISOString().slice(0, 10)) } });
console.log(`\ncleaned probe rows → results:${delR.count} remarks:${delRR.count} attendance:${delA.count}`);
console.log(all ? "\n✅ ALL TEACHING RBAC CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
await prisma.$disconnect();
process.exit(all ? 0 : 1);
