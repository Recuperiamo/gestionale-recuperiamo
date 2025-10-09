/*
  Warnings:

  - A unique constraint covering the columns `[streamId]` on the table `LavagnaTratto` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "LavagnaTratto" ADD COLUMN     "streamId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LavagnaTratto_streamId_key" ON "LavagnaTratto"("streamId");
