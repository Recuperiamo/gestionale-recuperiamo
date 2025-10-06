-- DropForeignKey
ALTER TABLE "public"."Pacchetto_ChangeLog" DROP CONSTRAINT "Pacchetto_ChangeLog_pacchettoId_fkey";

-- AlterTable
ALTER TABLE "public"."Pacchetto_ChangeLog" ADD COLUMN     "pacchettoDescrizione" TEXT,
ALTER COLUMN "pacchettoId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Pacchetto_ChangeLog" ADD CONSTRAINT "Pacchetto_ChangeLog_pacchettoId_fkey" FOREIGN KEY ("pacchettoId") REFERENCES "public"."PacchettoOre"("id") ON DELETE SET NULL ON UPDATE CASCADE;
