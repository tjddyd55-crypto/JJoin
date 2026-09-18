-- Additive SCREEN/FIELD Join track. Existing venues/joins remain SCREEN.
-- Never hard-deletes Join/Venue/wallet/participation rows.

CREATE TYPE "VenueType" AS ENUM ('SCREEN', 'FIELD');

ALTER TABLE "venues"
  ADD COLUMN "field_golf_course_id" UUID,
  ADD COLUMN "venue_type" "VenueType" NOT NULL DEFAULT 'SCREEN';

CREATE UNIQUE INDEX "venues_field_golf_course_id_key"
  ON "venues"("field_golf_course_id");

CREATE INDEX "venues_venue_type_idx"
  ON "venues"("venue_type");

CREATE TABLE "field_golf_courses" (
  "id" UUID NOT NULL,
  "external_source" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "address" TEXT,
  "road_address" TEXT,
  "sido" TEXT,
  "sigungu" TEXT,
  "phone" TEXT,
  "owner_name" TEXT,
  "area_sqm" TEXT,
  "hole_count" INTEGER,
  "status" TEXT,
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "consecutive_miss_count" INTEGER NOT NULL DEFAULT 0,
  "exclusion_reason" TEXT,
  "source_fingerprint" TEXT,
  "source_updated_at" TIMESTAMPTZ(6),
  "last_synced_at" TIMESTAMPTZ(6),
  "last_seen_at" TIMESTAMPTZ(6),
  "source_raw_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "field_golf_courses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "field_golf_courses_external_source_external_id_key"
  ON "field_golf_courses"("external_source", "external_id");

CREATE INDEX "field_golf_courses_is_active_name_idx"
  ON "field_golf_courses"("is_active", "name");

CREATE INDEX "field_golf_courses_sido_sigungu_idx"
  ON "field_golf_courses"("sido", "sigungu");

CREATE INDEX "field_golf_courses_normalized_name_idx"
  ON "field_golf_courses"("normalized_name");

CREATE INDEX "field_golf_courses_is_active_sido_sigungu_idx"
  ON "field_golf_courses"("is_active", "sido", "sigungu");

ALTER TABLE "venues"
  ADD CONSTRAINT "venues_field_golf_course_id_fkey"
  FOREIGN KEY ("field_golf_course_id")
  REFERENCES "field_golf_courses"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
