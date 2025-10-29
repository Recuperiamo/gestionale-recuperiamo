-- CreateTable
CREATE TABLE "LavagnaShape" (
    "id" SERIAL NOT NULL,
    "lavagnaId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "w" DOUBLE PRECISION,
    "h" DOUBLE PRECISION,
    "x1" DOUBLE PRECISION,
    "y1" DOUBLE PRECISION,
    "x2" DOUBLE PRECISION,
    "y2" DOUBLE PRECISION,
    "colore" TEXT,
    "spessore" DOUBLE PRECISION,
    "autoreUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LavagnaShape_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LavagnaShape_lavagnaId_idx" ON "LavagnaShape"("lavagnaId");

-- CreateIndex
CREATE INDEX "LavagnaShape_createdAt_idx" ON "LavagnaShape"("createdAt");

-- AddForeignKey
ALTER TABLE "LavagnaShape" ADD CONSTRAINT "LavagnaShape_lavagnaId_fkey" FOREIGN KEY ("lavagnaId") REFERENCES "Lavagna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LavagnaShape" ADD CONSTRAINT "LavagnaShape_autoreUserId_fkey" FOREIGN KEY ("autoreUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
