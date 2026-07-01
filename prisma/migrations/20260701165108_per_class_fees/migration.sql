/*
  Warnings:

  - You are about to drop the column `amount` on the `FeeItem` table. All the data in the column will be lost.
  - You are about to drop the column `appliesTo` on the `FeeItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FeeItem" DROP COLUMN "amount",
DROP COLUMN "appliesTo";

-- CreateTable
CREATE TABLE "ClassFee" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "feeItemId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "ClassFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassFee_schoolId_idx" ON "ClassFee"("schoolId");

-- CreateIndex
CREATE INDEX "ClassFee_classId_idx" ON "ClassFee"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassFee_feeItemId_classId_key" ON "ClassFee"("feeItemId", "classId");

-- AddForeignKey
ALTER TABLE "ClassFee" ADD CONSTRAINT "ClassFee_feeItemId_fkey" FOREIGN KEY ("feeItemId") REFERENCES "FeeItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassFee" ADD CONSTRAINT "ClassFee_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
