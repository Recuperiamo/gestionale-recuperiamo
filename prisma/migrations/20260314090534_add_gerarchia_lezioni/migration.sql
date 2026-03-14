/*
  Warnings:

  - You are about to drop the column `tags` on the `ArgomentoDidattico` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ArgomentoDidattico" DROP COLUMN "tags",
ADD COLUMN     "argomentoId" INTEGER,
ADD COLUMN     "macroArgomentoId" INTEGER;

-- CreateTable
CREATE TABLE "MacroArgomento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "materia" TEXT NOT NULL DEFAULT 'Generale',
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MacroArgomento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Argomento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "macroArgomentoId" INTEGER,
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Argomento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "MacroArgomento_materia_idx" ON "MacroArgomento"("materia");

-- CreateIndex
CREATE INDEX "Argomento_macroArgomentoId_idx" ON "Argomento"("macroArgomentoId");

-- CreateIndex
CREATE INDEX "ArgomentoDidattico_argomentoId_idx" ON "ArgomentoDidattico"("argomentoId");

-- CreateIndex
CREATE INDEX "ArgomentoDidattico_macroArgomentoId_idx" ON "ArgomentoDidattico"("macroArgomentoId");

-- AddForeignKey
ALTER TABLE "Argomento" ADD CONSTRAINT "Argomento_macroArgomentoId_fkey" FOREIGN KEY ("macroArgomentoId") REFERENCES "MacroArgomento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArgomentoDidattico" ADD CONSTRAINT "ArgomentoDidattico_argomentoId_fkey" FOREIGN KEY ("argomentoId") REFERENCES "Argomento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArgomentoDidattico" ADD CONSTRAINT "ArgomentoDidattico_macroArgomentoId_fkey" FOREIGN KEY ("macroArgomentoId") REFERENCES "MacroArgomento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
