-- CreateTable
CREATE TABLE "Quiz" (
    "id" SERIAL NOT NULL,
    "lezioneId" INTEGER NOT NULL,
    "titolo" TEXT NOT NULL,
    "domande" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TentativoQuiz" (
    "id" SERIAL NOT NULL,
    "quizId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "risposte" JSONB NOT NULL,
    "punteggio" DOUBLE PRECISION,
    "totaleAutomatico" INTEGER,
    "correzioneManuale" JSONB,
    "completatoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TentativoQuiz_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quiz_lezioneId_idx" ON "Quiz"("lezioneId");

-- CreateIndex
CREATE UNIQUE INDEX "TentativoQuiz_quizId_clienteId_key" ON "TentativoQuiz"("quizId", "clienteId");

-- CreateIndex
CREATE INDEX "TentativoQuiz_quizId_idx" ON "TentativoQuiz"("quizId");

-- CreateIndex
CREATE INDEX "TentativoQuiz_clienteId_idx" ON "TentativoQuiz"("clienteId");

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_lezioneId_fkey" FOREIGN KEY ("lezioneId") REFERENCES "ArgomentoDidattico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TentativoQuiz" ADD CONSTRAINT "TentativoQuiz_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TentativoQuiz" ADD CONSTRAINT "TentativoQuiz_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
