-- AlterTable
ALTER TABLE "Lavagna" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LavagnaTratto" ADD COLUMN IF NOT EXISTS "puntiCompresso" BYTEA;
ALTER TABLE "LavagnaTratto" ALTER COLUMN "punti" DROP NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lavagna_archivedAt_idx" ON "Lavagna"("archivedAt");
