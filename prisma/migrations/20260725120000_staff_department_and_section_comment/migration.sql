-- AlterTable: link a staff member to a department (HOD heads it; teachers belong to it)
ALTER TABLE "Staff" ADD COLUMN "departmentId" TEXT;

-- AlterTable: optional per-section reviewer note on an appraisal score
ALTER TABLE "AppraisalScore" ADD COLUMN "comment" TEXT;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
