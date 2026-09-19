-- CreateEnum
CREATE TYPE "StoreOperatingDayGroup" AS ENUM ('WEEKDAY', 'WEEKEND', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateEnum
CREATE TYPE "StorePriceDayType" AS ENUM ('WEEKDAY', 'WEEKEND', 'ALL');

-- AlterTable
ALTER TABLE "store_profiles" ADD COLUMN "screen_model" TEXT,
ADD COLUMN "room_count" INTEGER,
ADD COLUMN "phone" TEXT,
ADD COLUMN "reservation_label" TEXT,
ADD COLUMN "reservation_url" TEXT,
ADD COLUMN "reservation_note" TEXT,
ADD COLUMN "parking_available" BOOLEAN,
ADD COLUMN "parking_note" TEXT,
ADD COLUMN "left_handed_available" BOOLEAN,
ADD COLUMN "unmanned" BOOLEAN;

-- CreateTable
CREATE TABLE "store_operating_hours" (
    "id" TEXT NOT NULL,
    "profile_id" UUID NOT NULL,
    "day_group" "StoreOperatingDayGroup" NOT NULL,
    "label" TEXT,
    "start_time" VARCHAR(5),
    "end_time" VARCHAR(5),
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "is_24_hours" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_operating_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_price_slots" (
    "id" TEXT NOT NULL,
    "profile_id" UUID NOT NULL,
    "day_type" "StorePriceDayType" NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "price" INTEGER NOT NULL,
    "label" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_price_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_operating_hours_profile_id_sort_order_idx" ON "store_operating_hours"("profile_id", "sort_order");

-- CreateIndex
CREATE INDEX "store_price_slots_profile_id_day_type_sort_order_idx" ON "store_price_slots"("profile_id", "day_type", "sort_order");

-- AddForeignKey
ALTER TABLE "store_operating_hours" ADD CONSTRAINT "store_operating_hours_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "store_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_price_slots" ADD CONSTRAINT "store_price_slots_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "store_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
