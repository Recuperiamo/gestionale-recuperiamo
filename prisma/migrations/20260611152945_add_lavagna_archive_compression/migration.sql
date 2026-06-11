-- AlterTable (catalog-only, no file extension needed)
ALTER TABLE "Lavagna" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- AlterTable (catalog-only on modern Postgres — no table rewrite)
ALTER TABLE "LavagnaTratto" ADD COLUMN IF NOT EXISTS "puntiCompresso" BYTEA;
ALTER TABLE "LavagnaTratto" ALTER COLUMN "punti" DROP NOT NULL;

-- Index omesso: viene aggiunto con migrazione separata dopo aver liberato spazio
