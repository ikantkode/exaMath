-- Create enums
DO $$ BEGIN
 CREATE TYPE "EmployeeStatus" AS ENUM('ACTIVE', 'TERMINATED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "PaymentMethod" AS ENUM('WIRE', 'ZELLE', 'CASH', 'CHECK', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "PaymentType" AS ENUM('SALARY', 'BONUS', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add missing columns to Employee table
ALTER TABLE "Employee" ADD COLUMN "role" TEXT;
ALTER TABLE "Employee" ADD COLUMN "isPerDiem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Employee" ADD COLUMN "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE';

-- Create EmploymentPeriod table
CREATE TABLE "EmploymentPeriod" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "employeeId" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "salary" DOUBLE PRECISION,
  "hourlyRate" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmploymentPeriod_pkey" PRIMARY KEY ("id")
);

-- Create PaymentLog table
CREATE TABLE "PaymentLog" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "employeeId" TEXT NOT NULL,
  "employmentPeriodId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL,
  "paymentType" "PaymentType" NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE UNIQUE INDEX "EmploymentPeriod_employeeId_startDate_key" ON "EmploymentPeriod"("employeeId", "startDate");
CREATE INDEX "EmploymentPeriod_employeeId_idx" ON "EmploymentPeriod"("employeeId");
CREATE INDEX "PaymentLog_employeeId_idx" ON "PaymentLog"("employeeId");
CREATE INDEX "PaymentLog_employmentPeriodId_idx" ON "PaymentLog"("employmentPeriodId");

-- Add foreign keys
ALTER TABLE "EmploymentPeriod" ADD CONSTRAINT "EmploymentPeriod_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentLog" ADD CONSTRAINT "PaymentLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentLog" ADD CONSTRAINT "PaymentLog_employmentPeriodId_fkey" FOREIGN KEY ("employmentPeriodId") REFERENCES "EmploymentPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
