// Confirms the polished Home + Students pages render this school's REAL data.
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const { SignJWT } = require("jose");
const env = fs.readFileSync(".env", "utf8");
const url = (env.match(/DATABASE_URL="([^"]+)"/) || [])[1];
const secret = (env.match(/AUTH_SECRET="([^"]+)"/) || [])[1];
const prisma = new PrismaClient({ datasources: { db: { url } } });

(async () => {
  const email = `uni+${Date.now()}@klaska.test`;
  const school = await prisma.school.create({
    data: { name: "Test Academy", setupCompletedAt: new Date(), staff: { create: { name: "Head Person", email, passwordHash: "x", role: "OWNER" } } },
    include: { staff: true },
  });
  const owner = school.staff[0];
  const klass = await prisma.class.create({ data: { schoolId: school.id, name: "JSS 1", arm: "A" } });
  await prisma.student.create({ data: { schoolId: school.id, firstName: "Amaka", lastName: "Test", admissionNo: "KLK-0001", classId: klass.id } });

  const key = new TextEncoder().encode(secret);
  const token = await new SignJWT({ staffId: owner.id, schoolId: school.id, role: "OWNER", name: owner.name, email }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(key);
  const cookie = `klaska_session=${token}`;

  const home = await fetch("http://localhost:3000/", { headers: { cookie }, redirect: "manual" });
  const h = await home.text();
  console.log("HOME (authed)     ->", home.status, "| school:", /Test Academy/.test(h), "| student:", /Amaka/.test(h), "| polished KPIs:", /Present today/.test(h));

  const stu = await fetch("http://localhost:3000/people/students", { headers: { cookie }, redirect: "manual" });
  const s = await stu.text();
  console.log("STUDENTS (authed) ->", stu.status, "| student:", /Amaka/.test(s), "| class JSS 1 A:", /JSS 1 A/.test(s));

  const anon = await fetch("http://localhost:3000/", { redirect: "manual" });
  console.log("HOME (anon)       ->", anon.status, "| redirects to:", anon.headers.get("location"));

  await prisma.school.delete({ where: { id: school.id } });
  console.log("cleanup ok.");
  await prisma.$disconnect();
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
