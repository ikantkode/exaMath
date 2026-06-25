/*
  Warnings:

  - You are about to drop the column `agencyNumber` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `agencyNumberType` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `designNumber` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "agencyNumber",
DROP COLUMN "agencyNumberType",
DROP COLUMN "designNumber",
ADD COLUMN     "projectIdentificationIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "clientName" DROP NOT NULL;
