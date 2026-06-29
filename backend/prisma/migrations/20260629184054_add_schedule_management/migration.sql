-- CreateEnum
CREATE TYPE "ScheduleFormat" AS ENUM ('MSPDI', 'PMXML');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'WAITING', 'ON_HOLD');

-- CreateTable
CREATE TABLE "ScheduleSession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" "ScheduleFormat" NOT NULL,
    "projectId" TEXT,
    "originalXml" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleTask" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "finishDate" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualFinish" TIMESTAMP(3),
    "remainingDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "physicalPercentComplete" INTEGER NOT NULL DEFAULT 0,
    "status" "TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "predecessorIds" TEXT,
    "successorIds" TEXT,
    "calendarId" TEXT,
    "resourceIds" TEXT,
    "activityCode" TEXT,
    "originalXmlData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleChat" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "taskIds" TEXT,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleChat_pkey" PRIMARY KEY ("id")
);
