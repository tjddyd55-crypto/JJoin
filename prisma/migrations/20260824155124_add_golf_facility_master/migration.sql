-- CreateEnum
CREATE TYPE "GolfFacilitySource" AS ENUM ('LOCALDATA_GOLF_PRACTICE_RANGE', 'MANUAL', 'OWNER_REGISTERED', 'OTHER');

-- CreateEnum
CREATE TYPE "GolfFacilityType" AS ENUM ('SCREEN_GOLF', 'MIXED_GOLF_FACILITY', 'PRACTICE_RANGE', 'GOLF_ACADEMY', 'INDOOR_PRACTICE', 'OUTDOOR_PRACTICE', 'OTHER_GOLF_FACILITY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "GolfFacilitySportType" AS ENUM ('GOLF', 'PARK_GOLF');

-- CreateEnum
CREATE TYPE "HasScreenGolf" AS ENUM ('YES', 'NO', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ScreenStatus" AS ENUM ('CONFIRMED', 'POSSIBLE', 'UNKNOWN', 'NON_SCREEN');

-- CreateEnum
CREATE TYPE "ScreenConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "GolfFacilityBrand" AS ENUM ('GOLFZON', 'SG_GOLF', 'FRIENDS_SCREEN', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "GolfFacilityPhoneStatus" AS ENUM ('PRESENT', 'EMPTY', 'INVALID');

-- CreateEnum
CREATE TYPE "CoordinateSource" AS ENUM ('GOV_TM_CONVERTED', 'NAVER_GEOCODED', 'MANUAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CoordinateStatus" AS ENUM ('VALID', 'INVALID', 'MISSING');

-- CreateTable
CREATE TABLE "golf_facilities" (
    "id" UUID NOT NULL,
    "source" "GolfFacilitySource" NOT NULL,
    "government_source_key" TEXT NOT NULL,
    "management_no" TEXT NOT NULL,
    "local_government_code" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "display_name_overridden" BOOLEAN NOT NULL DEFAULT false,
    "source_phone" TEXT,
    "phone" TEXT,
    "phone_status" "GolfFacilityPhoneStatus" NOT NULL DEFAULT 'EMPTY',
    "phone_overridden" BOOLEAN NOT NULL DEFAULT false,
    "source_road_address" TEXT,
    "road_address" TEXT,
    "road_address_overridden" BOOLEAN NOT NULL DEFAULT false,
    "source_lot_address" TEXT,
    "lot_address" TEXT,
    "lot_address_overridden" BOOLEAN NOT NULL DEFAULT false,
    "postal_code" TEXT,
    "sido" TEXT,
    "sigungu" TEXT,
    "source_tm_x" DECIMAL(18,6),
    "source_tm_y" DECIMAL(18,6),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "coordinate_source" "CoordinateSource" NOT NULL DEFAULT 'UNKNOWN',
    "coordinate_status" "CoordinateStatus" NOT NULL DEFAULT 'MISSING',
    "coordinate_verified_at" TIMESTAMPTZ(6),
    "facility_type" "GolfFacilityType" NOT NULL,
    "sport_type" "GolfFacilitySportType" NOT NULL DEFAULT 'GOLF',
    "has_screen_golf" "HasScreenGolf" NOT NULL DEFAULT 'UNKNOWN',
    "screen_status" "ScreenStatus" NOT NULL DEFAULT 'UNKNOWN',
    "screen_confidence" "ScreenConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "screen_evidence" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "screen_golf_score" INTEGER,
    "screen_candidate" BOOLEAN NOT NULL DEFAULT false,
    "primary_brand" "GolfFacilityBrand" NOT NULL DEFAULT 'UNKNOWN',
    "screen_brands" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "business_status_code" TEXT,
    "business_status_name" TEXT,
    "detail_status_code" TEXT,
    "detail_status_name" TEXT,
    "license_date" DATE,
    "closure_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_screen_join_eligible" BOOLEAN NOT NULL DEFAULT false,
    "exclusion_reason" TEXT,
    "source_last_modified_at" TIMESTAMPTZ(6),
    "source_data_updated_at" TIMESTAMPTZ(6),
    "source_synced_at" TIMESTAMPTZ(6),
    "verified_at" TIMESTAMPTZ(6),
    "verified_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "golf_facilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "golf_facilities_is_active_is_screen_join_eligible_idx" ON "golf_facilities"("is_active", "is_screen_join_eligible");

-- CreateIndex
CREATE INDEX "golf_facilities_sido_sigungu_idx" ON "golf_facilities"("sido", "sigungu");

-- CreateIndex
CREATE INDEX "golf_facilities_facility_type_idx" ON "golf_facilities"("facility_type");

-- CreateIndex
CREATE INDEX "golf_facilities_screen_status_idx" ON "golf_facilities"("screen_status");

-- CreateIndex
CREATE INDEX "golf_facilities_has_screen_golf_idx" ON "golf_facilities"("has_screen_golf");

-- CreateIndex
CREATE INDEX "golf_facilities_sport_type_idx" ON "golf_facilities"("sport_type");

-- CreateIndex
CREATE INDEX "golf_facilities_normalized_name_idx" ON "golf_facilities"("normalized_name");

-- CreateIndex
CREATE UNIQUE INDEX "golf_facilities_source_government_source_key_key" ON "golf_facilities"("source", "government_source_key");
