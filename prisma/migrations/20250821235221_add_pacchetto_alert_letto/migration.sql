-- CreateTable
CREATE TABLE "public"."PacchettoAlertLetto" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "pacchettoId" INTEGER NOT NULL,
    "letto" BOOLEAN NOT NULL DEFAULT true,
    "dataLetto" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PacchettoAlertLetto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PacchettoAlertLetto_userId_pacchettoId_key" ON "public"."PacchettoAlertLetto"("userId", "pacchettoId");

-- AddForeignKey
ALTER TABLE "public"."PacchettoAlertLetto" ADD CONSTRAINT "PacchettoAlertLetto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PacchettoAlertLetto" ADD CONSTRAINT "PacchettoAlertLetto_pacchettoId_fkey" FOREIGN KEY ("pacchettoId") REFERENCES "public"."PacchettoOre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
