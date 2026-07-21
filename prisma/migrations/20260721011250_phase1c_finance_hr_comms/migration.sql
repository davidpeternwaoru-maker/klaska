-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "session" TEXT,
    "term" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalGross" INTEGER NOT NULL DEFAULT 0,
    "totalNet" INTEGER NOT NULL DEFAULT 0,
    "runBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "gross" INTEGER NOT NULL,
    "pension" INTEGER NOT NULL DEFAULT 0,
    "tax" INTEGER NOT NULL DEFAULT 0,
    "otherDeduction" INTEGER NOT NULL DEFAULT 0,
    "net" INTEGER NOT NULL,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appraisal" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "subjectStaffId" TEXT NOT NULL,
    "raterStaffId" TEXT,
    "raterRole" TEXT NOT NULL,
    "session" TEXT,
    "term" TEXT,
    "overall" INTEGER,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appraisal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalScore" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "competency" TEXT NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "AppraisalScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "noticeId" TEXT,
    "recipient" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_paymentId_key" ON "Receipt"("paymentId");

-- CreateIndex
CREATE INDEX "Receipt_schoolId_idx" ON "Receipt"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_schoolId_number_key" ON "Receipt"("schoolId", "number");

-- CreateIndex
CREATE INDEX "PayrollRun_schoolId_idx" ON "PayrollRun"("schoolId");

-- CreateIndex
CREATE INDEX "Payslip_staffId_idx" ON "Payslip"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_payrollRunId_staffId_key" ON "Payslip"("payrollRunId", "staffId");

-- CreateIndex
CREATE INDEX "Appraisal_schoolId_idx" ON "Appraisal"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Appraisal_subjectStaffId_raterRole_session_term_key" ON "Appraisal"("subjectStaffId", "raterRole", "session", "term");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalScore_appraisalId_competency_key" ON "AppraisalScore"("appraisalId", "competency");

-- CreateIndex
CREATE INDEX "NotificationLog_schoolId_createdAt_idx" ON "NotificationLog"("schoolId", "createdAt");

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appraisal" ADD CONSTRAINT "Appraisal_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appraisal" ADD CONSTRAINT "Appraisal_subjectStaffId_fkey" FOREIGN KEY ("subjectStaffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appraisal" ADD CONSTRAINT "Appraisal_raterStaffId_fkey" FOREIGN KEY ("raterStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalScore" ADD CONSTRAINT "AppraisalScore_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
