-- DropForeignKey
ALTER TABLE "public"."Lavagna" DROP CONSTRAINT "Lavagna_attivitaId_fkey";

-- AlterTable
ALTER TABLE "Lavagna" ALTER COLUMN "attivitaId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Lavagna" ADD CONSTRAINT "Lavagna_attivitaId_fkey" FOREIGN KEY ("attivitaId") REFERENCES "Attivita"("id") ON DELETE SET NULL ON UPDATE CASCADE;
