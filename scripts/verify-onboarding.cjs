// Verifies the gated onboarding flow with a real session cookie:
//  1) authenticated /onboarding renders the wizard
//  2) /dashboard redirects to /onboarding while setup is incomplete
// Creates a throwaway school, checks, then deletes it.
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const { SignJWT } = require("jose");

const env = fs.readFileSync(".env", "utf8");
const url = (env.match(/DATABASE_URL="([^"]+)"/) || [])[1];
const secret = (env.match(/AUTH_SECRET="([^"]+)"/) || [])[1];
const prisma = new PrismaClient({ datasources: { db: { url } } });

(async () => {
  const email = `wiz+${Date.now()}@klaska.test`;
  const school = await prisma.school.create({
    data: { name: "__wiz__ School", staff: { create: { name: "Wiz Owner", email, passwordHash: "x", role: "OWNER" } } },
    include: { staff: true },
  });
  const owner = school.staff[0];
  const key = new TextEncoder().encode(secret);
  const token = await new SignJWT({ staffId: owner.id, schoolId: school.id, role: "OWNER", name: owner.name, email })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(key);
  const cookie = `klaska_session=${token}`;

  const ob = await fetch("http://localhost:3000/onboarding", { headers: { cookie }, redirect: "manual" });
  const html = await ob.text();
  const rendersWizard = ob.status === 200 && /Set up your school/.test(html) && /School profile/.test(html);
  console.log("AUTHED /onboarding      -> status", ob.status, "| renders wizard:", rendersWizard);

  const dash = await fetch("http://localhost:3000/dashboard", { headers: { cookie }, redirect: "manual" });
  console.log("AUTHED /dashboard       -> status", dash.status, "| redirects to:", dash.headers.get("location"));

  await prisma.school.delete({ where: { id: school.id } });
  console.log("cleanup done.");
  await prisma.$disconnect();

  if (!rendersWizard) process.exit(1);
})().catch((e) => { console.error("VERIFY FAILED:", e.message); process.exit(1); });
