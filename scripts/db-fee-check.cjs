// Confirms the per-class fee tables work end-to-end against Neon.
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const url = (fs.readFileSync(".env", "utf8").match(/DATABASE_URL="([^"]+)"/) || [])[1];
const prisma = new PrismaClient({ datasources: { db: { url } } });

(async () => {
  const s = await prisma.school.create({ data: { name: "__fee__", staff: { create: { name: "o", email: `fee+${Date.now()}@k.test`, passwordHash: "x", role: "OWNER" } } } });
  const c = await prisma.class.create({ data: { schoolId: s.id, name: "SSS 1", arm: "Science" } });
  const fi = await prisma.feeItem.create({ data: { schoolId: s.id, name: "Tuition", mandatory: true, order: 0 } });
  await prisma.classFee.create({ data: { schoolId: s.id, feeItemId: fi.id, classId: c.id, amount: 150000 } });
  const read = await prisma.classFee.findFirst({ where: { schoolId: s.id }, include: { feeItem: true, class: true } });
  console.log("per-class fee ->", read.class.name, read.class.arm, "|", read.feeItem.name, "= NGN", read.amount.toLocaleString());
  await prisma.school.delete({ where: { id: s.id } });
  console.log("cleanup ok. ✅ per-class fee round-trip OK.");
  await prisma.$disconnect();
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
