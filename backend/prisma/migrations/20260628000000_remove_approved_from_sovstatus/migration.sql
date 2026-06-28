-- Remove APPROVED from SovStatus enum

-- Step 1: Drop defaults on columns using SovStatus
ALTER TABLE "ScheduleOfValue" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ChangeOrder" ALTER COLUMN "status" DROP DEFAULT;

-- Step 2: Rename old enum type
ALTER TYPE "SovStatus" RENAME TO "SovStatus_old";

-- Step 3: Create new enum without APPROVED
CREATE TYPE "SovStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'LOCKED');

-- Step 4: Cast columns to new type
ALTER TABLE "ScheduleOfValue" ALTER COLUMN "status" TYPE "SovStatus" USING ("status"::text::"SovStatus");
ALTER TABLE "ChangeOrder" ALTER COLUMN "status" TYPE "SovStatus" USING ("status"::text::"SovStatus");

-- Step 5: Re-add defaults
ALTER TABLE "ScheduleOfValue" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "ChangeOrder" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Step 6: Drop old enum type
DROP TYPE "SovStatus_old";
