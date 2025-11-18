-- CreateTable
CREATE TABLE "Programma" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "materia" TEXT,
    "titolo" TEXT NOT NULL,
    "descrizione" TEXT,
    "data" TIMESTAMP(3),
    "autoreUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Programma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Programma_clienteId_idx" ON "Programma"("clienteId");

-- CreateIndex
CREATE INDEX "Programma_materia_idx" ON "Programma"("materia");

-- AddForeignKey
ALTER TABLE "Programma" ADD CONSTRAINT "Programma_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Programma" ADD CONSTRAINT "Programma_autoreUserId_fkey" FOREIGN KEY ("autoreUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
