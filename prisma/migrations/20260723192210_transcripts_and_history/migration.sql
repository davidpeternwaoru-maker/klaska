/*
  Warnings:

  - A unique constraint covering the columns `[studentId,subjectId,session,term]` on the table `Result` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Result_studentId_subjectId_key";

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "admittedAt" TIMESTAMP(3),
ADD COLUMN     "photoUrl" TEXT;

-- CreateTable
CREATE TABLE "Transcript" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "coverage" TEXT NOT NULL,
    "sessionsCount" INTEGER NOT NULL DEFAULT 0,
    "requestedByStaffId" TEXT NOT NULL,
    "requestedByName" TEXT NOT NULL,
    "requestedByRole" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transcript_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transcript_schoolId_studentId_idx" ON "Transcript"("schoolId", "studentId");

-- CreateIndex
CREATE INDEX "Transcript_schoolId_createdAt_idx" ON "Transcript"("schoolId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transcript_schoolId_serial_key" ON "Transcript"("schoolId", "serial");

-- CreateIndex
CREATE INDEX "Result_studentId_session_term_idx" ON "Result"("studentId", "session", "term");

-- CreateIndex
CREATE UNIQUE INDEX "Result_studentId_subjectId_session_term_key" ON "Result"("studentId", "subjectId", "session", "term");

-- AddForeignKey
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
