// RBAC verification for appraisals — mints a session cookie per role and hits the
// /api/atest probe route to prove every access rule is enforced server-side.
// Run:  node scripts/verify-appraisals.mjs   (dev server must be on :3000)
import fs from "node:fs";
import { SignJWT } from "jose";

const env = fs.readFileSync(".env", "utf8");
const secret = new TextEncoder().encode((env.match(/AUTH_SECRET="?([^"\n]+)"?/) || [])[1]);
const SCHOOL = "demo-sunrise";

async function tok(staffId, role) {
  return new SignJWT({ staffId, schoolId: SCHOOL, role, name: staffId, email: staffId + "@sunrise.edu.ng", setupComplete: true })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);
}
async function probe(staffId, role, qs) {
  const t = await tok(staffId, role);
  const r = await fetch("http://localhost:3000/api/atest?" + qs, { headers: { cookie: "klaska_session=" + t } });
  return r.json();
}
const P = (label, expect, got) => {
  const ok = expect(got);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  →  ${JSON.stringify(got)}`);
  return ok;
};

// staff ids from seed-demo
const HOS = ["stf-hos", "HOS"], HOD = ["stf-hod1", "HOD"], OWNER = ["stf-owner", "OWNER"], BURSAR = ["stf-bursar", "BURSAR"];
const YUSUF = "stf-t2" /* Science */, EMEKA = "stf-t4" /* Science */, NGOZI = "stf-t3" /* Arts */;

let all = true;
const check = (...a) => { all = P(...a) && all; };

console.log("\n— Board scoping —");
check("HOS board sees all teaching staff (>=6)", (g) => g.count >= 6, await probe(...HOS, "probe=board"));
check("HOD (Science) board = ONLY Yusuf + Emeka", (g) => g.count === 2 && g.names.includes("Mr. Yusuf Bello") && g.names.includes("Mr. Emeka Nwosu"), await probe(...HOD, "probe=board"));
check("Bursar board DENIED", (g) => !!g.denied, await probe(...BURSAR, "probe=board"));

console.log("\n— Read visibility —");
check("Teacher reads OWN appraisal (ok)", (g) => g.subject && !g.denied, await probe(YUSUF, "TEACHER", "probe=read&id=" + YUSUF));
check("Teacher reads ANOTHER teacher → DENIED", (g) => !!g.denied, await probe(YUSUF, "TEACHER", "probe=read&id=" + EMEKA));
check("HOD reads in-dept teacher (ok)", (g) => g.subject && !g.denied, await probe(...HOD, "probe=read&id=" + YUSUF));
check("HOD reads OUT-of-dept teacher (Arts) → DENIED", (g) => !!g.denied, await probe(...HOD, "probe=read&id=" + NGOZI));
check("HOS reads any teacher (ok)", (g) => g.subject && !g.denied, await probe(...HOS, "probe=read&id=" + NGOZI));
check("Owner reads any teacher (ok, read-only)", (g) => g.subject && !g.denied, await probe(...OWNER, "probe=read&id=" + YUSUF));
check("Bursar reads any teacher → DENIED", (g) => !!g.denied, await probe(...BURSAR, "probe=read&id=" + YUSUF));

console.log("\n— Write RBAC (forbidden paths throw before any write) —");
check("Teacher writes SELF for another teacher → DENIED", (g) => !!g.denied, await probe(EMEKA, "TEACHER", "probe=write&id=" + YUSUF + "&rater=self"));
check("Teacher writes HOS for self → DENIED", (g) => !!g.denied, await probe(EMEKA, "TEACHER", "probe=write&id=" + EMEKA + "&rater=hos"));
check("HOD writes HOD for OUT-of-dept teacher → DENIED", (g) => !!g.denied, await probe(...HOD, "probe=write&id=" + NGOZI + "&rater=hod"));
check("HOD writes HOS for own dept teacher → DENIED", (g) => !!g.denied, await probe(...HOD, "probe=write&id=" + EMEKA + "&rater=hos"));
check("Owner writes (read-only) → DENIED", (g) => !!g.denied, await probe(...OWNER, "probe=write&id=" + YUSUF + "&rater=hos"));
check("Bursar writes → DENIED", (g) => !!g.denied, await probe(...BURSAR, "probe=write&id=" + YUSUF + "&rater=hos"));

console.log("\n" + (all ? "✅ ALL RBAC CHECKS PASSED" : "❌ SOME CHECKS FAILED"));
process.exit(all ? 0 : 1);
