-- CreateEnum
CREATE TYPE "MaterialeSottocategoria" AS ENUM ('TEORIA', 'SIMULAZIONI', 'ESERCIZI');

-- AlterTable
ALTER TABLE "MaterialeDidattico" ADD COLUMN     "sottocategoria" "MaterialeSottocategoria";
