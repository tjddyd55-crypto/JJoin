-- Additive golf coordinate canonical fields + enum values.

ALTER TYPE "CoordinateSource" ADD VALUE 'ADDRESS_GEOCODED';
ALTER TYPE "CoordinateStatus" ADD VALUE 'CORRECTED';
ALTER TYPE "CoordinateStatus" ADD VALUE 'REVIEW';

ALTER TABLE "golf_facilities"
  ADD COLUMN IF NOT EXISTS "source_wgs_latitude" DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS "source_wgs_longitude" DECIMAL(10,7);
