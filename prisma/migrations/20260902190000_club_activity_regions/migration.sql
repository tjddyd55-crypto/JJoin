-- Club multi activity regions (additive; legacy clubs.region retained)
CREATE TABLE "club_activity_regions" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "sido" TEXT NOT NULL,
    "sigungu" TEXT NOT NULL,
    "parent_sigungu" TEXT,
    "display_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_activity_regions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "club_activity_regions_club_sido_sigungu_key"
    ON "club_activity_regions"("club_id", "sido", "sigungu");

CREATE INDEX "club_activity_regions_sido_sigungu_idx"
    ON "club_activity_regions"("sido", "sigungu");

CREATE INDEX "club_activity_regions_club_id_idx"
    ON "club_activity_regions"("club_id");

ALTER TABLE "club_activity_regions"
    ADD CONSTRAINT "club_activity_regions_club_id_fkey"
    FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from legacy single region text (best-effort; manual clubs keep region string)
INSERT INTO "club_activity_regions" ("id", "club_id", "sido", "sigungu", "parent_sigungu", "display_name")
SELECT
    gen_random_uuid(),
    c.id,
    '미지정',
    LEFT(TRIM(c.region), 80),
    NULL,
    LEFT(TRIM(c.region), 80)
FROM "clubs" c
WHERE TRIM(c.region) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM "club_activity_regions" r WHERE r.club_id = c.id
  );
