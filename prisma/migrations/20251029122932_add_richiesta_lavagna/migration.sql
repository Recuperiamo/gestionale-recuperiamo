-- CreateTable
CREATE TABLE "RichiestaLavagna" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "titolo" TEXT,
    "noteStudente" TEXT,
    "noteAdmin" TEXT,
    "stato" "RichiestaStato" NOT NULL DEFAULT 'pending',
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lavagnaId" INTEGER,

    CONSTRAINT "RichiestaLavagna_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RichiestaLavagna_clienteId_idx" ON "RichiestaLavagna"("clienteId");

-- CreateIndex
CREATE INDEX "RichiestaLavagna_stato_idx" ON "RichiestaLavagna"("stato");
