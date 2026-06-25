/*
  Warnings:

  - You are about to drop the `Requisition` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SovStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "agencyNumber" TEXT,
ADD COLUMN     "agencyNumberType" TEXT,
ADD COLUMN     "designNumber" TEXT;

-- DropTable
DROP TABLE "Requisition";

-- DropEnum
DROP TYPE "RequisitionStatus";

-- CreateTable
CREATE TABLE "ScheduleOfValue" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SovStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleOfValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SovItem" (
    "id" TEXT NOT NULL,
    "sovId" TEXT NOT NULL,
    "itemNumber" INTEGER NOT NULL,
    "csiCode" TEXT NOT NULL,
    "csiCodeTitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SovItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeOrder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sovId" TEXT,
    "itemNumber" INTEGER,
    "csiCode" TEXT,
    "csiCodeTitle" TEXT,
    "description" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "status" "SovStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeOrder_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ScheduleOfValue" ADD CONSTRAINT "ScheduleOfValue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SovItem" ADD CONSTRAINT "SovItem_sovId_fkey" FOREIGN KEY ("sovId") REFERENCES "ScheduleOfValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_sovId_fkey" FOREIGN KEY ("sovId") REFERENCES "ScheduleOfValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
