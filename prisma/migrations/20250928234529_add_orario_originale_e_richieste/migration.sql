-- AlterEnum
ALTER TYPE "public"."RichiestaStato" ADD VALUE 'archived';

-- AlterTable
ALTER TABLE "public"."Attivita" ADD COLUMN     "orarioOriginale" TIMESTAMP(3);
