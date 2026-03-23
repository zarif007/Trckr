-- CreateEnum
CREATE TYPE "ReportDefinitionStatus" AS ENUM ('draft', 'ready', 'error');

-- CreateEnum
CREATE TYPE "ReportRunTrigger" AS ENUM ('initial', 'refresh');

-- CreateEnum
CREATE TYPE "ReportRunStatus" AS ENUM ('running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "Instance" AS ENUM ('SINGLE', 'MULTI');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "TrackerSchemaType" AS ENUM ('GENERAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SystemFileType" AS ENUM ('TEAMS', 'SETTINGS', 'RULES', 'CONNECTIONS');

-- CreateEnum
CREATE TYPE "ConversationMode" AS ENUM ('BUILDER', 'ANALYST');

-- CreateEnum
CREATE TYPE "ToolCallStatus" AS ENUM ('pending', 'running', 'done', 'error');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "LoginEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackerSchema" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "moduleId" TEXT,
    "name" TEXT,
    "type" "TrackerSchemaType" NOT NULL DEFAULT 'GENERAL',
    "systemType" "SystemFileType",
    "instance" "Instance" NOT NULL DEFAULT 'SINGLE',
    "versionControl" BOOLEAN NOT NULL DEFAULT false,
    "autoSave" BOOLEAN NOT NULL DEFAULT true,
    "listForSchemaId" TEXT,
    "schema" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackerSchema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "moduleId" TEXT,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trackerSchemaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportDefinition" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userPrompt" TEXT NOT NULL DEFAULT '',
    "intent" JSONB,
    "queryPlan" JSONB,
    "calcPlan" JSONB,
    "formatterPlan" JSONB,
    "definitionVersion" INTEGER NOT NULL DEFAULT 1,
    "schemaFingerprint" TEXT,
    "status" "ReportDefinitionStatus" NOT NULL DEFAULT 'draft',
    "readyAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportRun" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "trigger" "ReportRunTrigger" NOT NULL,
    "status" "ReportRunStatus" NOT NULL DEFAULT 'running',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ReportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportRunEvent" (
    "id" TEXT NOT NULL,
    "reportRunId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "phase" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportRunEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmTokenUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "trackerSchemaId" TEXT,
    "source" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LlmTokenUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackerData" (
    "id" TEXT NOT NULL,
    "trackerSchemaId" TEXT NOT NULL,
    "label" TEXT,
    "formStatus" TEXT,
    "data" JSONB NOT NULL,
    "branchName" TEXT NOT NULL DEFAULT 'main',
    "authorId" TEXT,
    "basedOnId" TEXT,
    "isMerged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackerData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "trackerSchemaId" TEXT NOT NULL,
    "title" TEXT,
    "mode" "ConversationMode" NOT NULL DEFAULT 'BUILDER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "content" TEXT NOT NULL,
    "trackerSchemaSnapshot" JSONB,
    "managerData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolCall" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "fieldPath" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ToolCallStatus" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "LoginEvent_userId_idx" ON "LoginEvent"("userId");

-- CreateIndex
CREATE INDEX "LoginEvent_createdAt_idx" ON "LoginEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Module_projectId_idx" ON "Module"("projectId");

-- CreateIndex
CREATE INDEX "Module_parentId_idx" ON "Module"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackerSchema_listForSchemaId_key" ON "TrackerSchema"("listForSchemaId");

-- CreateIndex
CREATE INDEX "TrackerSchema_projectId_idx" ON "TrackerSchema"("projectId");

-- CreateIndex
CREATE INDEX "TrackerSchema_moduleId_idx" ON "TrackerSchema"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackerSchema_projectId_moduleId_systemType_key" ON "TrackerSchema"("projectId", "moduleId", "systemType");

-- CreateIndex
CREATE INDEX "Report_projectId_idx" ON "Report"("projectId");

-- CreateIndex
CREATE INDEX "Report_userId_idx" ON "Report"("userId");

-- CreateIndex
CREATE INDEX "Report_trackerSchemaId_idx" ON "Report"("trackerSchemaId");

-- CreateIndex
CREATE INDEX "Report_moduleId_idx" ON "Report"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportDefinition_reportId_key" ON "ReportDefinition"("reportId");

-- CreateIndex
CREATE INDEX "ReportRun_reportId_idx" ON "ReportRun"("reportId");

-- CreateIndex
CREATE INDEX "ReportRunEvent_reportRunId_idx" ON "ReportRunEvent"("reportRunId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportRunEvent_reportRunId_seq_key" ON "ReportRunEvent"("reportRunId", "seq");

-- CreateIndex
CREATE INDEX "LlmTokenUsage_userId_idx" ON "LlmTokenUsage"("userId");

-- CreateIndex
CREATE INDEX "LlmTokenUsage_userId_projectId_idx" ON "LlmTokenUsage"("userId", "projectId");

-- CreateIndex
CREATE INDEX "LlmTokenUsage_userId_trackerSchemaId_idx" ON "LlmTokenUsage"("userId", "trackerSchemaId");

-- CreateIndex
CREATE INDEX "LlmTokenUsage_createdAt_idx" ON "LlmTokenUsage"("createdAt");

-- CreateIndex
CREATE INDEX "TrackerData_trackerSchemaId_idx" ON "TrackerData"("trackerSchemaId");

-- CreateIndex
CREATE INDEX "TrackerData_authorId_idx" ON "TrackerData"("authorId");

-- CreateIndex
CREATE INDEX "TrackerData_basedOnId_idx" ON "TrackerData"("basedOnId");

-- CreateIndex
CREATE INDEX "Conversation_trackerSchemaId_idx" ON "Conversation"("trackerSchemaId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "ToolCall_messageId_idx" ON "ToolCall"("messageId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginEvent" ADD CONSTRAINT "LoginEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerSchema" ADD CONSTRAINT "TrackerSchema_listForSchemaId_fkey" FOREIGN KEY ("listForSchemaId") REFERENCES "TrackerSchema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerSchema" ADD CONSTRAINT "TrackerSchema_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerSchema" ADD CONSTRAINT "TrackerSchema_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_trackerSchemaId_fkey" FOREIGN KEY ("trackerSchemaId") REFERENCES "TrackerSchema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportDefinition" ADD CONSTRAINT "ReportDefinition_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportRun" ADD CONSTRAINT "ReportRun_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportRunEvent" ADD CONSTRAINT "ReportRunEvent_reportRunId_fkey" FOREIGN KEY ("reportRunId") REFERENCES "ReportRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmTokenUsage" ADD CONSTRAINT "LlmTokenUsage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmTokenUsage" ADD CONSTRAINT "LlmTokenUsage_trackerSchemaId_fkey" FOREIGN KEY ("trackerSchemaId") REFERENCES "TrackerSchema"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmTokenUsage" ADD CONSTRAINT "LlmTokenUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerData" ADD CONSTRAINT "TrackerData_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerData" ADD CONSTRAINT "TrackerData_basedOnId_fkey" FOREIGN KEY ("basedOnId") REFERENCES "TrackerData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerData" ADD CONSTRAINT "TrackerData_trackerSchemaId_fkey" FOREIGN KEY ("trackerSchemaId") REFERENCES "TrackerSchema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_trackerSchemaId_fkey" FOREIGN KEY ("trackerSchemaId") REFERENCES "TrackerSchema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolCall" ADD CONSTRAINT "ToolCall_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
