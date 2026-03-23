-- AlterTable
ALTER TABLE "LlmTokenUsage" ADD COLUMN "reportId" TEXT;

-- CreateIndex
CREATE INDEX "LlmTokenUsage_userId_trackerSchemaId_reportId_idx" ON "LlmTokenUsage"("userId", "trackerSchemaId", "reportId");

-- AddForeignKey
ALTER TABLE "LlmTokenUsage" ADD CONSTRAINT "LlmTokenUsage_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
