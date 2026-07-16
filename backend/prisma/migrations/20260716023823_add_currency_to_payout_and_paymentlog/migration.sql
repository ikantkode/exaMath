/*
  Warnings:

  - You are about to drop the column `bonus` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `deductions` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `salary` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `taxes` on the `Employee` table. All the data in the column will be lost.
  - Added the required column `role` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Made the column `phone` on table `Employee` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `Employee` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `amountUSD` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amountUSD` to the `Payout` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('WIRE', 'ZELLE', 'CASH', 'CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('SALARY', 'BONUS', 'OTHER');

-- AlterEnum
ALTER TYPE "ScheduleFormat" ADD VALUE 'P6PRO';

-- DropForeignKey
ALTER TABLE "ScheduleVersion" DROP CONSTRAINT "ScheduleVersion_createdById_fkey";

-- DropForeignKey
ALTER TABLE "ScheduleVersion" DROP CONSTRAINT "ScheduleVersion_sessionId_fkey";

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "bonus",
DROP COLUMN "deductions",
DROP COLUMN "position",
DROP COLUMN "salary",
DROP COLUMN "taxes",
ADD COLUMN     "dependents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isPerDiem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'CREW',
ADD COLUMN     "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "email" SET NOT NULL;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "amountUSD" DOUBLE PRECISION,
ADD COLUMN "conversionRate" DOUBLE PRECISION,
ADD COLUMN "currency" TEXT DEFAULT 'USD';

UPDATE "Expense" SET "amountUSD" = "amount", "conversionRate" = 1, "currency" = 'USD';

ALTER TABLE "Expense" ALTER COLUMN "amountUSD" SET NOT NULL;
ALTER TABLE "Expense" ALTER COLUMN "currency" SET NOT NULL;

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN "amountUSD" DOUBLE PRECISION,
ADD COLUMN "conversionRate" DOUBLE PRECISION,
ADD COLUMN "currency" TEXT DEFAULT 'USD';

UPDATE "Payout" SET "amountUSD" = "amount", "conversionRate" = 1, "currency" = 'USD';

ALTER TABLE "Payout" ALTER COLUMN "amountUSD" SET NOT NULL;
ALTER TABLE "Payout" ALTER COLUMN "currency" SET NOT NULL;

-- Add missing columns to EmploymentPeriod if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'EmploymentPeriod' AND column_name = 'hourlyRate') THEN
    ALTER TABLE "EmploymentPeriod" ADD COLUMN "hourlyRate" DOUBLE PRECISION;
  END IF;
END $$;

-- Add missing columns to PaymentLog
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PaymentLog' AND column_name = 'currency') THEN
    ALTER TABLE "PaymentLog" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PaymentLog' AND column_name = 'conversionRate') THEN
    ALTER TABLE "PaymentLog" ADD COLUMN "conversionRate" DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PaymentLog' AND column_name = 'amountUSD') THEN
    ALTER TABLE "PaymentLog" ADD COLUMN "amountUSD" DOUBLE PRECISION NOT NULL DEFAULT 0;
  END IF;
END $$;

UPDATE "PaymentLog" SET "amountUSD" = "amount", "conversionRate" = 1, "currency" = 'USD' WHERE "amountUSD" = 0;

-- RecurringExpense should already exist from previous migration, add columns if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'RecurringExpense' AND column_name = 'currency') THEN
    ALTER TABLE "RecurringExpense" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'RecurringExpense' AND column_name = 'conversionRate') THEN
    ALTER TABLE "RecurringExpense" ADD COLUMN "conversionRate" DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'RecurringExpense' AND column_name = 'amountUSD') THEN
    ALTER TABLE "RecurringExpense" ADD COLUMN "amountUSD" DOUBLE PRECISION NOT NULL DEFAULT 0;
  END IF;
END $$;

UPDATE "RecurringExpense" SET "amountUSD" = "amount", "conversionRate" = 1, "currency" = 'USD' WHERE "amountUSD" = 0;
