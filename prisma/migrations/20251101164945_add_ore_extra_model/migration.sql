-- CreateTable
CREATE TABLE "OreExtra" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "pacchettoId" INTEGER,
    "ore" DOUBLE PRECISION NOT NULL,
    "descrizione" TEXT,
    "dataTracciamento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAssegnamento" TIMESTAMP(3),
    "stato" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "tracciaDa" TEXT,
    "assegnatoDa" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OreExtra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OreExtra_clienteId_idx" ON "OreExtra"("clienteId");

-- CreateIndex
CREATE INDEX "OreExtra_pacchettoId_idx" ON "OreExtra"("pacchettoId");

-- CreateIndex
CREATE INDEX "OreExtra_stato_idx" ON "OreExtra"("stato");

-- AddForeignKey
ALTER TABLE "OreExtra" ADD CONSTRAINT "OreExtra_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OreExtra" ADD CONSTRAINT "OreExtra_pacchettoId_fkey" FOREIGN KEY ("pacchettoId") REFERENCES "PacchettoOre"("id") ON DELETE SET NULL ON UPDATE CASCADE;
