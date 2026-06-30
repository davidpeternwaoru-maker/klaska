// Quick end-to-end persistence check against the real Neon database.
// Creates a school + owner + class + student, reads them back, then cleans up.
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

const env = fs.readFileSync(".env", "utf8");
const url = (env.match(/DATABASE_URL="([^"]+)"/) || [])[1];
const prisma = new PrismaClient({ datasources: { db: { url } } });

(async () => {
  const stamp = Date.now();
  const school = await prisma.school.create({
    data: {
      name: "__verify__ School",
      staff: { create: { name: "Test Owner", email: `verify+${stamp}@klaska.test`, passwordHash: "x", role: "OWNER" } },
    },
    include: { staff: true },
  });
  const klass = await prisma.class.create({ data: { schoolId: school.id, name: "JSS 1", arm: "A" } });
  const student = await prisma.student.create({
    data: { schoolId: school.id, firstName: "Ada", lastName: "Obi", admissionNo: "KLK-0001", classId: klass.id },
  });
  const count = await prisma.student.count({ where: { schoolId: school.id } });

  console.log("WROTE  -> school:", school.name);
  console.log("        owner:", school.staff[0].email, "(role " + school.staff[0].role + ")");
  console.log("        class:", klass.name, klass.arm);
  console.log("        student:", student.firstName, student.lastName, "(" + student.admissionNo + ")");
  console.log("READBACK-> students in school:", count);

  await prisma.school.delete({ where: { id: school.id } });
  console.log("CLEANUP -> test school removed (cascade). ✅ Round-trip OK.");
  await prisma.$disconnect();
})().catch((e) => {
  console.error("DB CHECK FAILED:", e.message);
  process.exit(1);
});
