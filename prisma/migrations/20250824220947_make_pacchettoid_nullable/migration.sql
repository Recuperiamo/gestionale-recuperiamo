-- DropForeignKey
ALTER TABLE "public"."Attivita" DROP CONSTRAINT "Attivita_pacchettoId_fkey";

-- AlterTable
ALTER TABLE "public"."Attivita" ALTER COLUMN "pacchettoId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Attivita" ADD CONSTRAINT "Attivita_pacchettoId_fkey" FOREIGN KEY ("pacchettoId") REFERENCES "public"."PacchettoOre"("id") ON DELETE SET NULL ON UPDATE CASCADE;
