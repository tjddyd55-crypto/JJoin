-- Additive FIELD join 1:1 cost/round extension.
-- Existing FIELD joins remain valid without a detail row.
-- KRW fees never enter the Coin wallet ledger.

CREATE TYPE "FieldGreenFeePayer" AS ENUM ('EACH_PERSON', 'HOST');
CREATE TYPE "FieldSplitFeePayer" AS ENUM ('EQUAL_SPLIT', 'HOST');
CREATE TYPE "FieldCaddieMode" AS ENUM ('CADDIE', 'NO_CADDIE');
CREATE TYPE "FieldTeeTimeMode" AS ENUM ('CONFIRMED', 'RECRUIT_FIRST', 'SOFT_WINDOW');

CREATE TABLE "field_join_details" (
  "id" UUID NOT NULL,
  "join_id" UUID NOT NULL,
  "green_fee_per_person" INTEGER,
  "green_fee_payer" "FieldGreenFeePayer" NOT NULL DEFAULT 'EACH_PERSON',
  "cart_fee_total" INTEGER,
  "cart_fee_payer" "FieldSplitFeePayer" NOT NULL DEFAULT 'EQUAL_SPLIT',
  "caddie_mode" "FieldCaddieMode" NOT NULL DEFAULT 'NO_CADDIE',
  "caddie_fee_total" INTEGER,
  "caddie_fee_payer" "FieldSplitFeePayer",
  "round_holes" INTEGER NOT NULL DEFAULT 18,
  "tee_time_mode" "FieldTeeTimeMode" NOT NULL DEFAULT 'CONFIRMED',
  "min_field_handicap" INTEGER,
  "max_field_handicap" INTEGER,
  "deposit_required" BOOLEAN NOT NULL DEFAULT false,
  "deposit_amount" INTEGER,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "field_join_details_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "field_join_details_join_id_key"
  ON "field_join_details"("join_id");

CREATE INDEX "field_join_details_caddie_mode_idx"
  ON "field_join_details"("caddie_mode");

CREATE INDEX "field_join_details_tee_time_mode_idx"
  ON "field_join_details"("tee_time_mode");

ALTER TABLE "field_join_details"
  ADD CONSTRAINT "field_join_details_join_id_fkey"
  FOREIGN KEY ("join_id")
  REFERENCES "joins"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
