-- AlterTable
ALTER TABLE "ScheduleChat" ADD COLUMN     "chatSessionId" TEXT,
ADD COLUMN     "isAI" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ScheduleChatSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'New Chat',
    "scheduleSessionId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleChatSession_pkey" PRIMARY KEY ("id")
);
