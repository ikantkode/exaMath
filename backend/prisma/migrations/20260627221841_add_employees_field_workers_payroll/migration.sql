/*
  Warnings:

  - You are about to drop the column `employeeName` on the `OfficePayroll` table. All the data in the column will be lost.
  - You are about to drop the column `insurance` on the `OfficePayroll` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `OfficePayroll` table. All the data in the column will be lost.
  - Added the required column `employeeId` to the `OfficePayroll` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wages` to the `OfficePayroll` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WageType" AS ENUM ('UNION', 'PREVAILING', 'PRIVATE');

-- CreateEnum
CREATE TYPE "CompensationType" AS ENUM ('W2', 'INDEPENDENT_CONTRACTOR');

-- AlterTable
ALTER TABLE "OfficePayroll" DROP COLUMN "employeeName",
DROP COLUMN "insurance",
DROP COLUMN "position",
ADD COLUMN     "benefits" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "employeeId" TEXT NOT NULL,
ADD COLUMN     "paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wages" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "taxes" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "wageType" "WageType";

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "position" TEXT,
    "compensationType" "CompensationType" NOT NULL,
    "salary" DOUBLE PRECISION NOT NULL,
    "bonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isUnion" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldWorker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "compensationType" "CompensationType" NOT NULL,
    "isUnion" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldWorker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldWorkerAssignment" (
    "id" TEXT NOT NULL,
    "fieldWorkerId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "wageRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "benefitRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldWorkerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldWorkerPayroll" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "hoursWorked" DOUBLE PRECISION NOT NULL,
    "grossWages" DOUBLE PRECISION NOT NULL,
    "grossBenefits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPay" DOUBLE PRECISION NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldWorkerPayroll_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FieldWorkerAssignment_fieldWorkerId_projectId_key" ON "FieldWorkerAssignment"("fieldWorkerId", "projectId");

-- AddForeignKey
ALTER TABLE "OfficePayroll" ADD CONSTRAINT "OfficePayroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldWorkerAssignment" ADD CONSTRAINT "FieldWorkerAssignment_fieldWorkerId_fkey" FOREIGN KEY ("fieldWorkerId") REFERENCES "FieldWorker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldWorkerAssignment" ADD CONSTRAINT "FieldWorkerAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldWorkerPayroll" ADD CONSTRAINT "FieldWorkerPayroll_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "FieldWorkerAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
