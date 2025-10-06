-- CreateTable
CREATE TABLE "public"."Lavagna" (
    "id" SERIAL NOT NULL,
    "attivitaId" INTEGER NOT NULL,
    "titolo" TEXT DEFAULT 'Lavagna',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lavagna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LavagnaTratto" (
    "id" SERIAL NOT NULL,
    "lavagnaId" INTEGER NOT NULL,
    "autoreUserId" INTEGER NOT NULL,
    "strumento" TEXT NOT NULL,
    "colore" TEXT,
    "spessore" DOUBLE PRECISION,
    "punti" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LavagnaTratto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lavagna_attivitaId_key" ON "public"."Lavagna"("attivitaId");

-- CreateIndex
CREATE INDEX "Lavagna_createdAt_idx" ON "public"."Lavagna"("createdAt");

-- CreateIndex
CREATE INDEX "LavagnaTratto_lavagnaId_idx" ON "public"."LavagnaTratto"("lavagnaId");

-- CreateIndex
CREATE INDEX "LavagnaTratto_autoreUserId_idx" ON "public"."LavagnaTratto"("autoreUserId");

-- CreateIndex
CREATE INDEX "LavagnaTratto_createdAt_idx" ON "public"."LavagnaTratto"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Lavagna" ADD CONSTRAINT "Lavagna_attivitaId_fkey" FOREIGN KEY ("attivitaId") REFERENCES "public"."Attivita"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LavagnaTratto" ADD CONSTRAINT "LavagnaTratto_lavagnaId_fkey" FOREIGN KEY ("lavagnaId") REFERENCES "public"."Lavagna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LavagnaTratto" ADD CONSTRAINT "LavagnaTratto_autoreUserId_fkey" FOREIGN KEY ("autoreUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
