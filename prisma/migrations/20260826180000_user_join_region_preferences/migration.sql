-- User preferred districts for Weekly + Regional Join Discovery
CREATE TABLE IF NOT EXISTS "user_join_region_preferences" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "sido" TEXT NOT NULL,
  "sigungu" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "user_join_region_preferences_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_join_region_preferences_user_id_sido_sigungu_key"
  ON "user_join_region_preferences" ("user_id", "sido", "sigungu");

CREATE INDEX IF NOT EXISTS "user_join_region_preferences_user_id_sort_order_idx"
  ON "user_join_region_preferences" ("user_id", "sort_order");
