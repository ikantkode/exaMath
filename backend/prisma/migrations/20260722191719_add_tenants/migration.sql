/*
  Warnings:

  - You are about to drop the column `bonus` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `deductions` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `salary` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `taxes` on the `Employee` table. All the data in the column will be lost.
  - Added the required column `tenantId` to the `ChangeOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Made the column `phone` on table `Employee` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `Employee` required. This step will fail if there are existing NULL values in that column.
  - Made the column `role` on table `Employee` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `tenantId` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `FieldWorker` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `FixedAsset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `OfficePayroll` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amountUSD` to the `PaymentLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `PaymentLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amountUSD` to the `Payout` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Payout` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `RecurringExpense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `ScheduleOfValue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `ScheduleSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Timesheet` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('OWNER', 'MANAGER', 'CREW');

-- AlterEnum
ALTER TYPE "ScheduleFormat" ADD VALUE 'P6PRO';

-- DropForeignKey
ALTER TABLE "EmploymentPeriod" DROP CONSTRAINT "EmploymentPeriod_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentLog" DROP CONSTRAINT "PaymentLog_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentLog" DROP CONSTRAINT "PaymentLog_employmentPeriodId_fkey";

-- DropForeignKey
ALTER TABLE "RecurringExpense" DROP CONSTRAINT "RecurringExpense_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduleVersion" DROP CONSTRAINT "ScheduleVersion_createdById_fkey";

-- DropForeignKey
ALTER TABLE "ScheduleVersion" DROP CONSTRAINT "ScheduleVersion_sessionId_fkey";

-- DropIndex
DROP INDEX "EmploymentPeriod_employeeId_idx";

-- DropIndex
DROP INDEX "PaymentLog_employeeId_idx";

-- DropIndex
DROP INDEX "PaymentLog_employmentPeriodId_idx";

-- DropIndex
DROP INDEX "RecurringExpense_projectId_idx";

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "ChangeOrder" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "bonus",
DROP COLUMN "deductions",
DROP COLUMN "position",
DROP COLUMN "salary",
DROP COLUMN "taxes",
ADD COLUMN     "dependents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "role" SET NOT NULL;

-- AlterTable
ALTER TABLE "EmploymentPeriod" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "tenantId" TEXT NOT NULL,
ALTER COLUMN "amountUSD" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FieldWorker" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FixedAsset" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "OfficePayroll" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PaymentLog" ADD COLUMN     "amountUSD" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "conversionRate" DOUBLE PRECISION,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "tenantId" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ADD CONSTRAINT "PaymentLog_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "amountUSD" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "conversionRate" DOUBLE PRECISION,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RecurringExpense" ADD COLUMN     "tenantId" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ScheduleOfValue" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ScheduleSession" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Timesheet" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "schemaName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL DEFAULT 'CREW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_schemaName_key" ON "Tenant"("schemaName");

-- CreateIndex
CREATE UNIQUE INDEX "TenantUser_userId_tenantId_key" ON "TenantUser"("userId", "tenantId");
