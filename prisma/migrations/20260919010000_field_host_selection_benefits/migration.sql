-- Additive FIELD host-selection + benefit flags.
-- Keeps cart/caddie amount columns from 20260918180000 (deprecated in primary UX).
-- Does not mutate Coin ledger rows or Production data.

ALTER TABLE "field_join_details"
  ADD COLUMN "benefit_green_fee" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "benefit_cart" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "benefit_caddie" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "applications_closed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "join_participants"
  ADD COLUMN "application_note" VARCHAR(80),
  ADD COLUMN "host_review_status" VARCHAR(20);
