-- AlterTable
ALTER TABLE "School" ADD COLUMN     "session" TEXT,
ADD COLUMN     "term" TEXT,
ADD COLUMN     "termEnd" TIMESTAMP(3),
ADD COLUMN     "termStart" TIMESTAMP(3);
