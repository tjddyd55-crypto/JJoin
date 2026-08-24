-- Map bounds / eligible filters (MVP; no PostGIS).
CREATE INDEX IF NOT EXISTS "golf_facilities_is_active_is_screen_join_eligible_coordinate_status_idx"
  ON "golf_facilities" ("is_active", "is_screen_join_eligible", "coordinate_status");

CREATE INDEX IF NOT EXISTS "golf_facilities_latitude_longitude_idx"
  ON "golf_facilities" ("latitude", "longitude");
