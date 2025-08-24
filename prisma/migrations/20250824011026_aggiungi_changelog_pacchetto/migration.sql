-- CreateTable
CREATE TABLE "public"."Pacchetto_ChangeLog" (
    "id" SERIAL NOT NULL,
    "pacchettoId" INTEGER NOT NULL,
    "orePrima" DOUBLE PRECISION NOT NULL,
    "oreDopo" DOUBLE PRECISION NOT NULL,
    "tipoOperazione" TEXT NOT NULL,
    "attivitaId" INTEGER,
    "utente" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivazione" TEXT,

    CONSTRAINT "Pacchetto_ChangeLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Pacchetto_ChangeLog" ADD CONSTRAINT "Pacchetto_ChangeLog_pacchettoId_fkey" FOREIGN KEY ("pacchettoId") REFERENCES "public"."PacchettoOre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pacchetto_ChangeLog" ADD CONSTRAINT "Pacchetto_ChangeLog_attivitaId_fkey" FOREIGN KEY ("attivitaId") REFERENCES "public"."Attivita"("id") ON DELETE SET NULL ON UPDATE CASCADE;
