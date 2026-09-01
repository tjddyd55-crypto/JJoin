-- Club Event SCREEN venue: optional GolfFacility snapshot link (additive)
ALTER TABLE "club_events" ADD COLUMN IF NOT EXISTS "golf_facility_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'club_events_golf_facility_id_fkey'
  ) THEN
    ALTER TABLE "club_events"
      ADD CONSTRAINT "club_events_golf_facility_id_fkey"
      FOREIGN KEY ("golf_facility_id") REFERENCES "golf_facilities"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "club_events_golf_facility_id_idx" ON "club_events"("golf_facility_id");
