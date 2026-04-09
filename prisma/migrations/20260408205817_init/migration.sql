-- CreateEnum
CREATE TYPE "ReportDefinitionStatus" AS ENUM ('draft', 'ready', 'error');

-- CreateEnum
CREATE TYPE "ReportRunTrigger" AS ENUM ('initial', 'refresh');

-- CreateEnum
CREATE TYPE "ReportRunStatus" AS ENUM ('running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('TAB', 'SECTION', 'GRID');

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

-- CreateEnum
CREATE TYPE "WorkflowRunStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'skipped');

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
    "settings" JSONB,
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
    "settings" JSONB,
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
    "meta" JSONB,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
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
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "moduleId" TEXT,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trackerSchemaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisDefinition" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "userPrompt" TEXT NOT NULL DEFAULT '',
    "outline" JSONB,
    "queryPlan" JSONB,
    "document" JSONB,
    "definitionVersion" INTEGER NOT NULL DEFAULT 1,
    "schemaFingerprint" TEXT,
    "status" "ReportDefinitionStatus" NOT NULL DEFAULT 'draft',
    "readyAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "trigger" "ReportRunTrigger" NOT NULL,
    "status" "ReportRunStatus" NOT NULL DEFAULT 'running',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisRunEvent" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "phase" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisRunEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmTokenUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "trackerSchemaId" TEXT,
    "reportId" TEXT,
    "analysisId" TEXT,
    "source" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LlmTokenUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackerNode" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "type" "NodeType" NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "placeId" INTEGER NOT NULL,
    "parentId" TEXT,
    "config" JSONB,
    "views" JSONB,

    CONSTRAINT "TrackerNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackerField" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "ui" JSONB NOT NULL,
    "config" JSONB,

    CONSTRAINT "TrackerField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackerLayoutNode" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "gridId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "order" DOUBLE PRECISION NOT NULL,
    "row" INTEGER,
    "col" INTEGER,
    "renderAs" TEXT,

    CONSTRAINT "TrackerLayoutNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackerBinding" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "sourceGridId" TEXT,
    "sourceFieldId" TEXT,
    "targetGridId" TEXT NOT NULL,
    "targetFieldId" TEXT NOT NULL,
    "config" JSONB NOT NULL,

    CONSTRAINT "TrackerBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackerValidation" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "gridId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "rules" JSONB NOT NULL,

    CONSTRAINT "TrackerValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackerCalculation" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "gridId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "expression" JSONB NOT NULL,

    CONSTRAINT "TrackerCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackerDynamicOption" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "gridId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "definition" JSONB NOT NULL,

    CONSTRAINT "TrackerDynamicOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackerFieldRule" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "gridId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "config" JSONB NOT NULL,

    CONSTRAINT "TrackerFieldRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GridRow" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "gridId" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "schemaVersion" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "statusTag" TEXT,
    "sortOrder" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "branchName" TEXT NOT NULL DEFAULT 'main',
    "isMerged" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GridRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GridRowReference" (
    "fromRowId" TEXT NOT NULL,
    "fromFieldId" TEXT NOT NULL,
    "toRowId" TEXT NOT NULL,

    CONSTRAINT "GridRowReference_pkey" PRIMARY KEY ("fromRowId","fromFieldId")
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
    "masterDataBuildResult" JSONB,
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

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "moduleId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "schema" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'pending',
    "trigger" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRunStep" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'pending',
    "inputData" JSONB,
    "outputData" JSONB,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "WorkflowRunStep_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "Analysis_projectId_idx" ON "Analysis"("projectId");

-- CreateIndex
CREATE INDEX "Analysis_userId_idx" ON "Analysis"("userId");

-- CreateIndex
CREATE INDEX "Analysis_trackerSchemaId_idx" ON "Analysis"("trackerSchemaId");

-- CreateIndex
CREATE INDEX "Analysis_moduleId_idx" ON "Analysis"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisDefinition_analysisId_key" ON "AnalysisDefinition"("analysisId");

-- CreateIndex
CREATE INDEX "AnalysisRun_analysisId_idx" ON "AnalysisRun"("analysisId");

-- CreateIndex
CREATE INDEX "AnalysisRunEvent_analysisRunId_idx" ON "AnalysisRunEvent"("analysisRunId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisRunEvent_analysisRunId_seq_key" ON "AnalysisRunEvent"("analysisRunId", "seq");

-- CreateIndex
CREATE INDEX "LlmTokenUsage_userId_idx" ON "LlmTokenUsage"("userId");

-- CreateIndex
CREATE INDEX "LlmTokenUsage_userId_projectId_idx" ON "LlmTokenUsage"("userId", "projectId");

-- CreateIndex
CREATE INDEX "LlmTokenUsage_userId_trackerSchemaId_idx" ON "LlmTokenUsage"("userId", "trackerSchemaId");

-- CreateIndex
CREATE INDEX "LlmTokenUsage_userId_trackerSchemaId_reportId_idx" ON "LlmTokenUsage"("userId", "trackerSchemaId", "reportId");

-- CreateIndex
CREATE INDEX "LlmTokenUsage_userId_trackerSchemaId_analysisId_idx" ON "LlmTokenUsage"("userId", "trackerSchemaId", "analysisId");

-- CreateIndex
CREATE INDEX "LlmTokenUsage_createdAt_idx" ON "LlmTokenUsage"("createdAt");

-- CreateIndex
CREATE INDEX "TrackerNode_trackerId_idx" ON "TrackerNode"("trackerId");

-- CreateIndex
CREATE INDEX "TrackerNode_parentId_idx" ON "TrackerNode"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackerNode_trackerId_slug_key" ON "TrackerNode"("trackerId", "slug");

-- CreateIndex
CREATE INDEX "TrackerField_trackerId_idx" ON "TrackerField"("trackerId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackerField_trackerId_slug_key" ON "TrackerField"("trackerId", "slug");

-- CreateIndex
CREATE INDEX "TrackerLayoutNode_trackerId_idx" ON "TrackerLayoutNode"("trackerId");

-- CreateIndex
CREATE INDEX "TrackerLayoutNode_gridId_idx" ON "TrackerLayoutNode"("gridId");

-- CreateIndex
CREATE INDEX "TrackerLayoutNode_fieldId_idx" ON "TrackerLayoutNode"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackerLayoutNode_gridId_fieldId_key" ON "TrackerLayoutNode"("gridId", "fieldId");

-- CreateIndex
CREATE INDEX "TrackerBinding_trackerId_idx" ON "TrackerBinding"("trackerId");

-- CreateIndex
CREATE INDEX "TrackerBinding_sourceGridId_idx" ON "TrackerBinding"("sourceGridId");

-- CreateIndex
CREATE INDEX "TrackerBinding_targetGridId_idx" ON "TrackerBinding"("targetGridId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackerBinding_targetGridId_targetFieldId_key" ON "TrackerBinding"("targetGridId", "targetFieldId");

-- CreateIndex
CREATE INDEX "TrackerValidation_trackerId_idx" ON "TrackerValidation"("trackerId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackerValidation_gridId_fieldId_key" ON "TrackerValidation"("gridId", "fieldId");

-- CreateIndex
CREATE INDEX "TrackerCalculation_trackerId_idx" ON "TrackerCalculation"("trackerId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackerCalculation_gridId_fieldId_key" ON "TrackerCalculation"("gridId", "fieldId");

-- CreateIndex
CREATE INDEX "TrackerDynamicOption_trackerId_idx" ON "TrackerDynamicOption"("trackerId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackerDynamicOption_gridId_fieldId_key" ON "TrackerDynamicOption"("gridId", "fieldId");

-- CreateIndex
CREATE INDEX "TrackerFieldRule_trackerId_idx" ON "TrackerFieldRule"("trackerId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackerFieldRule_gridId_fieldId_key" ON "TrackerFieldRule"("gridId", "fieldId");

-- CreateIndex
CREATE INDEX "GridRow_trackerId_idx" ON "GridRow"("trackerId");

-- CreateIndex
CREATE INDEX "GridRow_gridId_idx" ON "GridRow"("gridId");

-- CreateIndex
CREATE INDEX "GridRow_gridId_branchName_idx" ON "GridRow"("gridId", "branchName");

-- CreateIndex
CREATE INDEX "GridRow_deletedAt_idx" ON "GridRow"("deletedAt");

-- CreateIndex
CREATE INDEX "GridRowReference_toRowId_idx" ON "GridRowReference"("toRowId");

-- CreateIndex
CREATE INDEX "Conversation_trackerSchemaId_idx" ON "Conversation"("trackerSchemaId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "ToolCall_messageId_idx" ON "ToolCall"("messageId");

-- CreateIndex
CREATE INDEX "Workflow_projectId_idx" ON "Workflow"("projectId");

-- CreateIndex
CREATE INDEX "Workflow_moduleId_idx" ON "Workflow"("moduleId");

-- CreateIndex
CREATE INDEX "WorkflowRun_workflowId_idx" ON "WorkflowRun"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowRun_status_idx" ON "WorkflowRun"("status");

-- CreateIndex
CREATE INDEX "WorkflowRunStep_runId_idx" ON "WorkflowRunStep"("runId");

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
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_trackerSchemaId_fkey" FOREIGN KEY ("trackerSchemaId") REFERENCES "TrackerSchema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisDefinition" ADD CONSTRAINT "AnalysisDefinition_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRunEvent" ADD CONSTRAINT "AnalysisRunEvent_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmTokenUsage" ADD CONSTRAINT "LlmTokenUsage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmTokenUsage" ADD CONSTRAINT "LlmTokenUsage_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmTokenUsage" ADD CONSTRAINT "LlmTokenUsage_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmTokenUsage" ADD CONSTRAINT "LlmTokenUsage_trackerSchemaId_fkey" FOREIGN KEY ("trackerSchemaId") REFERENCES "TrackerSchema"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmTokenUsage" ADD CONSTRAINT "LlmTokenUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerNode" ADD CONSTRAINT "TrackerNode_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "TrackerSchema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerNode" ADD CONSTRAINT "TrackerNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TrackerNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerField" ADD CONSTRAINT "TrackerField_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "TrackerSchema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerLayoutNode" ADD CONSTRAINT "TrackerLayoutNode_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "TrackerSchema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerLayoutNode" ADD CONSTRAINT "TrackerLayoutNode_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "TrackerNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerLayoutNode" ADD CONSTRAINT "TrackerLayoutNode_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "TrackerField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerBinding" ADD CONSTRAINT "TrackerBinding_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "TrackerSchema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerBinding" ADD CONSTRAINT "TrackerBinding_sourceGridId_fkey" FOREIGN KEY ("sourceGridId") REFERENCES "TrackerNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerBinding" ADD CONSTRAINT "TrackerBinding_sourceFieldId_fkey" FOREIGN KEY ("sourceFieldId") REFERENCES "TrackerField"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerBinding" ADD CONSTRAINT "TrackerBinding_targetGridId_fkey" FOREIGN KEY ("targetGridId") REFERENCES "TrackerNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerBinding" ADD CONSTRAINT "TrackerBinding_targetFieldId_fkey" FOREIGN KEY ("targetFieldId") REFERENCES "TrackerField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerValidation" ADD CONSTRAINT "TrackerValidation_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "TrackerSchema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerValidation" ADD CONSTRAINT "TrackerValidation_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "TrackerNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerValidation" ADD CONSTRAINT "TrackerValidation_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "TrackerField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerCalculation" ADD CONSTRAINT "TrackerCalculation_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "TrackerSchema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerCalculation" ADD CONSTRAINT "TrackerCalculation_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "TrackerNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerCalculation" ADD CONSTRAINT "TrackerCalculation_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "TrackerField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerDynamicOption" ADD CONSTRAINT "TrackerDynamicOption_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "TrackerSchema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerDynamicOption" ADD CONSTRAINT "TrackerDynamicOption_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "TrackerNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerDynamicOption" ADD CONSTRAINT "TrackerDynamicOption_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "TrackerField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerFieldRule" ADD CONSTRAINT "TrackerFieldRule_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "TrackerSchema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerFieldRule" ADD CONSTRAINT "TrackerFieldRule_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "TrackerNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerFieldRule" ADD CONSTRAINT "TrackerFieldRule_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "TrackerField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GridRow" ADD CONSTRAINT "GridRow_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "TrackerSchema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GridRow" ADD CONSTRAINT "GridRow_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "TrackerNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GridRow" ADD CONSTRAINT "GridRow_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GridRowReference" ADD CONSTRAINT "GridRowReference_fromRowId_fkey" FOREIGN KEY ("fromRowId") REFERENCES "GridRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GridRowReference" ADD CONSTRAINT "GridRowReference_fromFieldId_fkey" FOREIGN KEY ("fromFieldId") REFERENCES "TrackerField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GridRowReference" ADD CONSTRAINT "GridRowReference_toRowId_fkey" FOREIGN KEY ("toRowId") REFERENCES "GridRow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_trackerSchemaId_fkey" FOREIGN KEY ("trackerSchemaId") REFERENCES "TrackerSchema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolCall" ADD CONSTRAINT "ToolCall_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRunStep" ADD CONSTRAINT "WorkflowRunStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
