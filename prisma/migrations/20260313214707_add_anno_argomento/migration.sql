-- AlterTable
ALTER TABLE "ArgomentoDidattico" ADD COLUMN     "anno" TEXT;

-- CreateIndex
CREATE INDEX "ArgomentoDidattico_anno_idx" ON "ArgomentoDidattico"("anno");
