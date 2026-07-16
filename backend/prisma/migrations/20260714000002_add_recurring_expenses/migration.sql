CREATE TABLE "RecurringExpense" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "conversionRate" DOUBLE PRECISION,
  "amountUSD" DOUBLE PRECISION NOT NULL,
  "frequency" TEXT NOT NULL DEFAULT 'Monthly',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RecurringExpense_projectId_idx" ON "RecurringExpense"("projectId");

ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
