-- CreateEnum
CREATE TYPE "MaterialeSezione" AS ENUM ('MATERIALE', 'COMPITI', 'VOTI');

-- AlterTable
ALTER TABLE "MaterialeDidattico" ADD COLUMN     "sezione" "MaterialeSezione" NOT NULL DEFAULT 'MATERIALE';
