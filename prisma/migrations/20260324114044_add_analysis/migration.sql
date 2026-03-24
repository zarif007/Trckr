-- AlterTable
ALTER TABLE "LlmTokenUsage" ADD COLUMN     "analysisId" TEXT;

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
CREATE INDEX "LlmTokenUsage_userId_trackerSchemaId_analysisId_idx" ON "LlmTokenUsage"("userId", "trackerSchemaId", "analysisId");

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
ALTER TABLE "LlmTokenUsage" ADD CONSTRAINT "LlmTokenUsage_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
