/*
  Warnings:

  - Added the required column `tenantId` to the `BudgetCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `EmploymentPeriod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `FieldWorkerAssignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `FieldWorkerPayroll` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `ScheduleChat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `ScheduleTask` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `ScheduleVersion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `SovItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `SubcontractorAgreement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `SubcontractorChangeOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `SubcontractorFile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BudgetCategory" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "EmploymentPeriod" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FieldWorkerAssignment" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FieldWorkerPayroll" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "originalContract" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "ScheduleChat" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ScheduleTask" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ScheduleVersion" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SovItem" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SubcontractorAgreement" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SubcontractorChangeOrder" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SubcontractorFile" ADD COLUMN     "tenantId" TEXT NOT NULL;
