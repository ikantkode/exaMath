-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "BudgetCategory" DROP CONSTRAINT "BudgetCategory_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ChangeOrder" DROP CONSTRAINT "ChangeOrder_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ChangeOrder" DROP CONSTRAINT "ChangeOrder_sovId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_projectId_fkey";

-- DropForeignKey
ALTER TABLE "FieldWorkerAssignment" DROP CONSTRAINT "FieldWorkerAssignment_fieldWorkerId_fkey";

-- DropForeignKey
ALTER TABLE "FieldWorkerAssignment" DROP CONSTRAINT "FieldWorkerAssignment_projectId_fkey";

-- DropForeignKey
ALTER TABLE "FieldWorkerPayroll" DROP CONSTRAINT "FieldWorkerPayroll_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "OfficePayroll" DROP CONSTRAINT "OfficePayroll_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduleOfValue" DROP CONSTRAINT "ScheduleOfValue_projectId_fkey";

-- DropForeignKey
ALTER TABLE "SovItem" DROP CONSTRAINT "SovItem_sovId_fkey";

-- DropForeignKey
ALTER TABLE "Timesheet" DROP CONSTRAINT "Timesheet_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Timesheet" DROP CONSTRAINT "Timesheet_userId_fkey";

-- CreateTable
CREATE TABLE "SubcontractorAgreement" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "subcontractorName" TEXT NOT NULL,
    "contractValue" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubcontractorAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubcontractorChangeOrder" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubcontractorChangeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubcontractorFile" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT,
    "changeOrderId" TEXT,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubcontractorFile_pkey" PRIMARY KEY ("id")
);
