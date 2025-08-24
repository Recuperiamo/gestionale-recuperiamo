-- Trigger e funzione per garantire che, se viene indicato un pacchetto,
-- questo appartenga al cliente specificato nell'attività

-- Funzione di controllo
CREATE OR REPLACE FUNCTION check_pacchetto_cliente()
RETURNS trigger AS $$
BEGIN
  IF NEW."pacchettoId" IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM "PacchettoOre"
      WHERE id = NEW."pacchettoId" AND "clienteId" = NEW."clienteId"
    ) THEN
      RAISE EXCEPTION 'Pacchetto (%) non appartiene al cliente (%)', NEW."pacchettoId", NEW."clienteId";
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Rimozione precedente trigger se presente
DROP TRIGGER IF EXISTS trg_check_pacchetto_cliente ON "Attivita";

-- Creazione trigger
CREATE TRIGGER trg_check_pacchetto_cliente
  BEFORE INSERT OR UPDATE ON "Attivita"
  FOR EACH ROW
  EXECUTE PROCEDURE check_pacchetto_cliente();