-- AlterTable
ALTER TABLE "Lavagna" ADD COLUMN     "clienteId" INTEGER;

-- CreateIndex
CREATE INDEX "Lavagna_clienteId_idx" ON "Lavagna"("clienteId");

-- AddForeignKey
ALTER TABLE "Lavagna" ADD CONSTRAINT "Lavagna_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
