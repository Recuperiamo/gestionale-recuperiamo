-- AlterTable: aggiunge campo snapshot (tldraw) alla tabella Lavagna
ALTER TABLE "Lavagna" ADD COLUMN "snapshot" JSONB;
