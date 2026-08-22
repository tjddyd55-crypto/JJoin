-- Phase J: at most one OPEN/active reward hold per Join
CREATE UNIQUE INDEX IF NOT EXISTS coin_holds_join_id_unique
  ON coin_holds (join_id)
  WHERE join_id IS NOT NULL;
