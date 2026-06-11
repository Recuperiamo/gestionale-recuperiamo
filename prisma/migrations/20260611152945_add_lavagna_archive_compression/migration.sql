-- AlterTable
ALTER TABLE "Lavagna" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LavagnaTratto" ADD COLUMN     "puntiCompresso" BYTEA,
ALTER COLUMN "punti" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Lavagna_archivedAt_idx" ON "Lavagna"("archivedAt");
