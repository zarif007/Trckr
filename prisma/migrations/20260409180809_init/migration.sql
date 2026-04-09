-- DropForeignKey
ALTER TABLE "GridRowReference" DROP CONSTRAINT "GridRowReference_toRowId_fkey";

-- AlterTable
ALTER TABLE "GridRowReference" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TrackerSchemaCache" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "assembledJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackerSchemaCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrackerSchemaCache_trackerId_key" ON "TrackerSchemaCache"("trackerId");

-- CreateIndex
CREATE INDEX "TrackerSchemaCache_trackerId_schemaVersion_idx" ON "TrackerSchemaCache"("trackerId", "schemaVersion");

-- CreateIndex
CREATE INDEX "GridRow_trackerId_deletedAt_branchName_updatedAt_idx" ON "GridRow"("trackerId", "deletedAt", "branchName", "updatedAt");

-- CreateIndex
CREATE INDEX "GridRow_trackerId_statusTag_idx" ON "GridRow"("trackerId", "statusTag");

-- CreateIndex
CREATE INDEX "GridRowReference_deletedAt_idx" ON "GridRowReference"("deletedAt");

-- CreateIndex
CREATE INDEX "TrackerBinding_trackerId_targetGridId_idx" ON "TrackerBinding"("trackerId", "targetGridId");

-- CreateIndex
CREATE INDEX "TrackerLayoutNode_trackerId_gridId_idx" ON "TrackerLayoutNode"("trackerId", "gridId");

-- CreateIndex
CREATE INDEX "TrackerNode_trackerId_type_idx" ON "TrackerNode"("trackerId", "type");

-- AddForeignKey
ALTER TABLE "GridRowReference" ADD CONSTRAINT "GridRowReference_toRowId_fkey" FOREIGN KEY ("toRowId") REFERENCES "GridRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerSchemaCache" ADD CONSTRAINT "TrackerSchemaCache_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "TrackerSchema"("id") ON DELETE CASCADE ON UPDATE CASCADE;
