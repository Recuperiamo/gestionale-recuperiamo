-- AlterTable
ALTER TABLE "public"."Attivita" ADD COLUMN     "clienteId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."Attivita" ADD CONSTRAINT "Attivita_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
