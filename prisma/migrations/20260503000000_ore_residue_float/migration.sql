-- AlterTable: oreResidue Int → Float per supportare ore frazionarie (es. 0.5, 0.75)
ALTER TABLE "PacchettoOre" ALTER COLUMN "oreResidue" TYPE DOUBLE PRECISION USING "oreResidue"::DOUBLE PRECISION;

-- AlterTable: oreConsumate Int → Float (stesso motivo)
ALTER TABLE "Attivita" ALTER COLUMN "oreConsumate" TYPE DOUBLE PRECISION USING "oreConsumate"::DOUBLE PRECISION;
