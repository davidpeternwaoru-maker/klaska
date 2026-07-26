-- Online payment attempts (Paystack). `reference` is unique = idempotency key.
CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "studentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "provider" TEXT NOT NULL DEFAULT 'PAYSTACK',
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "email" TEXT,
    "authorizationUrl" TEXT,
    "accessCode" TEXT,
    "channel" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentIntent_reference_key" ON "PaymentIntent"("reference");
CREATE INDEX "PaymentIntent_schoolId_idx" ON "PaymentIntent"("schoolId");
CREATE INDEX "PaymentIntent_invoiceId_idx" ON "PaymentIntent"("invoiceId");
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
