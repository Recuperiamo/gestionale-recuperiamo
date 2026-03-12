-- CreateTable
CREATE TABLE "Nota" (
    "id" SERIAL NOT NULL,
    "testo" TEXT NOT NULL,
    "clienteId" INTEGER,
    "data" TIMESTAMP(3),
    "colore" TEXT DEFAULT '#7C3AED',
    "autoreUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Nota_clienteId_idx" ON "Nota"("clienteId");

-- CreateIndex
CREATE INDEX "Nota_data_idx" ON "Nota"("data");

-- CreateIndex
CREATE INDEX "Nota_autoreUserId_idx" ON "Nota"("autoreUserId");

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_autoreUserId_fkey" FOREIGN KEY ("autoreUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
