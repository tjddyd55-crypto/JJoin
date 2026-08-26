-- Store owner verification + STORE_MATCHING join fields (additive, non-destructive)

DO $$ BEGIN
  CREATE TYPE "JoinKind" AS ENUM ('STANDARD', 'STORE_MATCHING');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MatchingRewardTarget" AS ENUM ('FEMALE', 'MALE', 'ALL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "StoreVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "StoreOwnerRelation" AS ENUM ('REPRESENTATIVE', 'OWNER', 'MANAGER', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "StoreOwnershipStatus" AS ENUM ('ACTIVE', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "joins" ADD COLUMN IF NOT EXISTS "join_kind" "JoinKind" NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "joins" ADD COLUMN IF NOT EXISTS "recruit_closes_at" TIMESTAMPTZ(6);
ALTER TABLE "joins" ADD COLUMN IF NOT EXISTS "minimum_players" INTEGER;
ALTER TABLE "joins" ADD COLUMN IF NOT EXISTS "target_male_count" INTEGER;
ALTER TABLE "joins" ADD COLUMN IF NOT EXISTS "target_female_count" INTEGER;
ALTER TABLE "joins" ADD COLUMN IF NOT EXISTS "matching_reward_target" "MatchingRewardTarget";
ALTER TABLE "joins" ADD COLUMN IF NOT EXISTS "store_ownership_id" UUID;

CREATE INDEX IF NOT EXISTS "joins_join_kind_status_start_at_idx"
  ON "joins" ("join_kind", "status", "start_at");
CREATE INDEX IF NOT EXISTS "joins_recruit_closes_at_idx"
  ON "joins" ("recruit_closes_at");

CREATE TABLE IF NOT EXISTS "store_ownership_requests" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "golf_facility_id" UUID NOT NULL,
  "applicant_name" TEXT NOT NULL,
  "applicant_phone" TEXT NOT NULL,
  "relation" "StoreOwnerRelation" NOT NULL,
  "memo" TEXT,
  "business_registration_no" TEXT,
  "status" "StoreVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "admin_note" TEXT,
  "reject_reason" TEXT,
  "reviewed_by_admin_user_id" UUID,
  "reviewed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "store_ownership_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "store_ownership_requests_status_created_at_idx"
  ON "store_ownership_requests" ("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "store_ownership_requests_user_id_created_at_idx"
  ON "store_ownership_requests" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "store_ownership_requests_golf_facility_id_idx"
  ON "store_ownership_requests" ("golf_facility_id");

DO $$ BEGIN
  ALTER TABLE "store_ownership_requests"
    ADD CONSTRAINT "store_ownership_requests_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "store_ownership_requests"
    ADD CONSTRAINT "store_ownership_requests_golf_facility_id_fkey"
    FOREIGN KEY ("golf_facility_id") REFERENCES "golf_facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "store_ownership_requests"
    ADD CONSTRAINT "store_ownership_requests_reviewed_by_admin_user_id_fkey"
    FOREIGN KEY ("reviewed_by_admin_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "store_ownerships" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "golf_facility_id" UUID NOT NULL,
  "venue_id" UUID,
  "request_id" UUID,
  "status" "StoreOwnershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "approved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "store_ownerships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "store_ownerships_user_id_golf_facility_id_key"
  ON "store_ownerships" ("user_id", "golf_facility_id");
CREATE UNIQUE INDEX IF NOT EXISTS "store_ownerships_request_id_key"
  ON "store_ownerships" ("request_id");
CREATE INDEX IF NOT EXISTS "store_ownerships_user_id_status_idx"
  ON "store_ownerships" ("user_id", "status");
CREATE INDEX IF NOT EXISTS "store_ownerships_golf_facility_id_status_idx"
  ON "store_ownerships" ("golf_facility_id", "status");

DO $$ BEGIN
  ALTER TABLE "store_ownerships"
    ADD CONSTRAINT "store_ownerships_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "store_ownerships"
    ADD CONSTRAINT "store_ownerships_golf_facility_id_fkey"
    FOREIGN KEY ("golf_facility_id") REFERENCES "golf_facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "store_ownerships"
    ADD CONSTRAINT "store_ownerships_venue_id_fkey"
    FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "store_ownerships"
    ADD CONSTRAINT "store_ownerships_request_id_fkey"
    FOREIGN KEY ("request_id") REFERENCES "store_ownership_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "joins"
    ADD CONSTRAINT "joins_store_ownership_id_fkey"
    FOREIGN KEY ("store_ownership_id") REFERENCES "store_ownerships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
