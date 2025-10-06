-- CreateEnum
CREATE TYPE "public"."RichiestaStato" AS ENUM ('pending', 'in_review', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "public"."RichiestaTipo" AS ENUM ('cambio_data', 'cambio_orario', 'cancellazione');

-- AlterTable
ALTER TABLE "public"."Attivita" ADD COLUMN     "durataOre" DOUBLE PRECISION,
ADD COLUMN     "orario" TIMESTAMP(3),
ADD COLUMN     "ricorrenzaId" INTEGER,
ADD COLUMN     "stato" TEXT;

-- CreateTable
CREATE TABLE "public"."RichiestaModifica" (
    "id" SERIAL NOT NULL,
    "attivitaId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "tipo" "public"."RichiestaTipo" NOT NULL,
    "stato" "public"."RichiestaStato" NOT NULL DEFAULT 'pending',
    "nuovaData" TIMESTAMP(3),
    "nuovoOrario" TIMESTAMP(3),
    "nuovaDurataOre" DOUBLE PRECISION,
    "noteStudente" TEXT,
    "noteAdmin" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RichiestaModifica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RichiestaModifica_clienteId_idx" ON "public"."RichiestaModifica"("clienteId");

-- CreateIndex
CREATE INDEX "RichiestaModifica_attivitaId_idx" ON "public"."RichiestaModifica"("attivitaId");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_attivita_stato" ON "public"."RichiestaModifica"("attivitaId", "stato");

-- CreateIndex
CREATE INDEX "Attivita_clienteId_idx" ON "public"."Attivita"("clienteId");

-- CreateIndex
CREATE INDEX "Attivita_pacchettoId_idx" ON "public"."Attivita"("pacchettoId");

-- CreateIndex
CREATE INDEX "Attivita_orario_idx" ON "public"."Attivita"("orario");

-- AddForeignKey
ALTER TABLE "public"."RichiestaModifica" ADD CONSTRAINT "RichiestaModifica_attivitaId_fkey" FOREIGN KEY ("attivitaId") REFERENCES "public"."Attivita"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RichiestaModifica" ADD CONSTRAINT "RichiestaModifica_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
