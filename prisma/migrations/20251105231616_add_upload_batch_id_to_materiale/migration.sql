-- AlterTable
ALTER TABLE "MaterialeDidattico" ADD COLUMN     "uploadBatchId" TEXT;

-- CreateIndex
CREATE INDEX "MaterialeDidattico_uploadBatchId_idx" ON "MaterialeDidattico"("uploadBatchId");
