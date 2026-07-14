-- Add currency, conversionRate, and amountUSD columns to Expense table
ALTER TABLE "Expense" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "Expense" ADD COLUMN "conversionRate" DOUBLE PRECISION;
ALTER TABLE "Expense" ADD COLUMN "amountUSD" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill amountUSD with existing amount values (all existing expenses are USD)
UPDATE "Expense" SET "amountUSD" = "amount" WHERE "amountUSD" = 0;
