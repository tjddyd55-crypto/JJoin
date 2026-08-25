-- AlterTable
ALTER TABLE "golf_facilities" ADD COLUMN IF NOT EXISTS "last_seen_at" TIMESTAMPTZ(6);
ALTER TABLE "golf_facilities" ADD COLUMN IF NOT EXISTS "consecutive_miss_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "golf_facilities" ADD COLUMN IF NOT EXISTS "source_raw_json" JSONB;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "golf_facilities_is_active_coordinate_status_idx"
  ON "golf_facilities"("is_active", "coordinate_status");
CREATE INDEX IF NOT EXISTS "golf_facilities_last_seen_at_idx"
  ON "golf_facilities"("last_seen_at");

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PublicGolfFacilitySyncRunStatus" AS ENUM (
    'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED', 'ABORTED_GUARD'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "public_golf_facility_sync_runs" (
  "id" UUID NOT NULL,
  "status" "PublicGolfFacilitySyncRunStatus" NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'LOCALDATA_GOLF_PRACTICE_RANGE',
  "started_at" TIMESTAMPTZ(6) NOT NULL,
  "finished_at" TIMESTAMPTZ(6),
  "fetched_pages" INTEGER NOT NULL DEFAULT 0,
  "fetched_count" INTEGER NOT NULL DEFAULT 0,
  "inserted_count" INTEGER NOT NULL DEFAULT 0,
  "updated_count" INTEGER NOT NULL DEFAULT 0,
  "unchanged_count" INTEGER NOT NULL DEFAULT 0,
  "inactive_count" INTEGER NOT NULL DEFAULT 0,
  "geocoded_count" INTEGER NOT NULL DEFAULT 0,
  "failed_count" INTEGER NOT NULL DEFAULT 0,
  "error_summary" TEXT,
  "meta" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "public_golf_facility_sync_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "public_golf_facility_sync_runs_started_at_idx"
  ON "public_golf_facility_sync_runs"("started_at");
CREATE INDEX IF NOT EXISTS "public_golf_facility_sync_runs_status_started_at_idx"
  ON "public_golf_facility_sync_runs"("status", "started_at");
