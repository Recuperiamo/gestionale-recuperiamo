-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('REFERENTE', 'STUDENTE');

-- AlterTable
ALTER TABLE "Client"
  ADD COLUMN "tipo" "ClientType" NOT NULL DEFAULT 'REFERENTE',
  ADD COLUMN "referenteId" INTEGER;

-- CreateIndex
CREATE INDEX "Client_referenteId_idx" ON "Client"("referenteId");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_referenteId_fkey" FOREIGN KEY ("referenteId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
