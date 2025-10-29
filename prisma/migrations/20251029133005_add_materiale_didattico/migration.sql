-- CreateTable
CREATE TABLE "MaterialeDidattico" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "titolo" TEXT NOT NULL,
    "materia" TEXT,
    "nomeOriginale" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialeDidattico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialeDidattico_clienteId_idx" ON "MaterialeDidattico"("clienteId");

-- CreateIndex
CREATE INDEX "MaterialeDidattico_createdAt_idx" ON "MaterialeDidattico"("createdAt");
