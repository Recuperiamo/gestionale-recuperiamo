-- CreateTable
CREATE TABLE "ArgomentoDidattico" (
    "id" SERIAL NOT NULL,
    "titolo" TEXT NOT NULL,
    "materia" TEXT NOT NULL DEFAULT 'Generale',
    "mappaHtml" TEXT,
    "teoriaHtml" TEXT,
    "eserciziHtml" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArgomentoDidattico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssegnazioneArgomento" (
    "id" SERIAL NOT NULL,
    "argomentoId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssegnazioneArgomento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArgomentoDidattico_materia_idx" ON "ArgomentoDidattico"("materia");

-- CreateIndex
CREATE INDEX "AssegnazioneArgomento_clienteId_idx" ON "AssegnazioneArgomento"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "AssegnazioneArgomento_argomentoId_clienteId_key" ON "AssegnazioneArgomento"("argomentoId", "clienteId");

-- AddForeignKey
ALTER TABLE "AssegnazioneArgomento" ADD CONSTRAINT "AssegnazioneArgomento_argomentoId_fkey" FOREIGN KEY ("argomentoId") REFERENCES "ArgomentoDidattico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssegnazioneArgomento" ADD CONSTRAINT "AssegnazioneArgomento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
