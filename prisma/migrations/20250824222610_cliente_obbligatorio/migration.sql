/*
  Warnings:

  - Made the column `clienteId` on table `Attivita` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."Attivita" DROP CONSTRAINT "Attivita_clienteId_fkey";

-- AlterTable
ALTER TABLE "public"."Attivita" ALTER COLUMN "clienteId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Attivita" ADD CONSTRAINT "Attivita_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
