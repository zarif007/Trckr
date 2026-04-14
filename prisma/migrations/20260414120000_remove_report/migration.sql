-- Remove report feature: drop FKs and column on LlmTokenUsage, then report tables.
-- Guarded so `prisma migrate dev` shadow DB (replay from empty) does not fail when
-- `LlmTokenUsage` is created only by an earlier migration in the chain.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'LlmTokenUsage'
  ) THEN
    ALTER TABLE "LlmTokenUsage" DROP CONSTRAINT IF EXISTS "LlmTokenUsage_reportId_fkey";
    DROP INDEX IF EXISTS "LlmTokenUsage_userId_trackerSchemaId_reportId_idx";
    ALTER TABLE "LlmTokenUsage" DROP COLUMN IF EXISTS "reportId";
  END IF;
END $$;

DROP TABLE IF EXISTS "ReportRunEvent" CASCADE;
DROP TABLE IF EXISTS "ReportRun" CASCADE;
DROP TABLE IF EXISTS "ReportDefinition" CASCADE;
DROP TABLE IF EXISTS "Report" CASCADE;
