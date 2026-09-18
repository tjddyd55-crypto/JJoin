-- Additive major feature expansion: play format, profile lifestyle,
-- profile-match prefs, store profiles, banners, ads, coin gift, rewards.
-- Do NOT apply on Production from this branch.

-- Enums
CREATE TYPE "JoinPlayFormat" AS ENUM ('INDIVIDUAL', 'TEAM');
CREATE TYPE "DrinkingHabit" AS ENUM ('NONE', 'SOMETIMES', 'NORMAL', 'OFTEN');
CREATE TYPE "SmokingHabit" AS ENUM ('NONE', 'CIGARETTE', 'E_CIG', 'BOTH');
CREATE TYPE "StoreScreenBrand" AS ENUM ('GOLFZON', 'KAKAO_VX', 'SG_GOLF', 'OTHER');
CREATE TYPE "StoreProfileVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "StoreBannerAdStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'ACTIVE', 'EXPIRED');
CREATE TYPE "RewardGrantKind" AS ENUM ('ATTENDANCE', 'HOST_MILESTONE', 'PARTICIPATION_MILESTONE');
CREATE TYPE "ProfileMatchPreferredGender" AS ENUM ('ANY', 'MALE', 'FEMALE');

ALTER TYPE "CoinTxType" ADD VALUE IF NOT EXISTS 'COIN_GIFT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PROFILE_MATCH_JOIN';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ATTENDANCE_REWARD';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ACHIEVEMENT_REWARD';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COIN_GIFT_RECEIVED';

-- Existing table columns
ALTER TABLE "notification_preferences"
  ADD COLUMN "profile_match_enabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "user_profiles"
  ADD COLUMN "personality" TEXT,
  ADD COLUMN "age" INTEGER,
  ADD COLUMN "height_cm" INTEGER,
  ADD COLUMN "drinking" "DrinkingHabit",
  ADD COLUMN "smoking" "SmokingHabit",
  ADD COLUMN "show_age" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "show_height" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "show_drinking" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "show_smoking" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "show_handicap" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "user_profile_photos"
  ADD COLUMN "is_primary" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "user_sport_profiles"
  ADD COLUMN "field_handicap" INTEGER;

ALTER TABLE "joins"
  ADD COLUMN "play_format" "JoinPlayFormat" NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN "team_size" INTEGER,
  ADD COLUMN "team_count" INTEGER;

ALTER TABLE "join_participants"
  ADD COLUMN "team_index" INTEGER;

-- Feature flags + reward policy singletons
CREATE TABLE "feature_flag_settings" (
  "id" TEXT NOT NULL,
  "clubs_ui_enabled" BOOLEAN NOT NULL DEFAULT false,
  "profile_match_alerts_enabled" BOOLEAN NOT NULL DEFAULT true,
  "store_profiles_enabled" BOOLEAN NOT NULL DEFAULT true,
  "home_banners_enabled" BOOLEAN NOT NULL DEFAULT true,
  "store_banner_ads_enabled" BOOLEAN NOT NULL DEFAULT true,
  "coin_gift_enabled" BOOLEAN NOT NULL DEFAULT true,
  "attendance_rewards_enabled" BOOLEAN NOT NULL DEFAULT true,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" UUID,
  CONSTRAINT "feature_flag_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "feature_flag_settings" ("id") VALUES ('default')
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "reward_policy_settings" (
  "id" TEXT NOT NULL,
  "attendance_enabled" BOOLEAN NOT NULL DEFAULT true,
  "attendance_amount" DECIMAL(18,4) NOT NULL DEFAULT 1,
  "host_enabled" BOOLEAN NOT NULL DEFAULT true,
  "host_threshold" INTEGER NOT NULL DEFAULT 5,
  "host_amount" DECIMAL(18,4) NOT NULL DEFAULT 10,
  "participation_enabled" BOOLEAN NOT NULL DEFAULT true,
  "participation_threshold" INTEGER NOT NULL DEFAULT 5,
  "participation_amount" DECIMAL(18,4) NOT NULL DEFAULT 5,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" UUID,
  CONSTRAINT "reward_policy_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "reward_policy_settings" ("id") VALUES ('default')
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "profile_match_preferences" (
  "user_id" UUID NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "preferred_gender" "ProfileMatchPreferredGender" NOT NULL DEFAULT 'ANY',
  "min_age" INTEGER,
  "max_age" INTEGER,
  "min_field_handicap" INTEGER,
  "max_field_handicap" INTEGER,
  "min_screen_handicap" INTEGER,
  "max_screen_handicap" INTEGER,
  "drinking_habits" "DrinkingHabit"[] NOT NULL DEFAULT ARRAY[]::"DrinkingHabit"[],
  "smoking_habits" "SmokingHabit"[] NOT NULL DEFAULT ARRAY[]::"SmokingHabit"[],
  "sido" TEXT,
  "sigungu" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "profile_match_preferences_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "profile_match_preferences_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "profile_match_preferences_enabled_preferred_gender_idx"
  ON "profile_match_preferences"("enabled", "preferred_gender");

CREATE TABLE "store_profiles" (
  "id" UUID NOT NULL,
  "ownership_id" UUID NOT NULL,
  "intro" TEXT,
  "vibe" TEXT,
  "amenities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "screen_brand" "StoreScreenBrand" NOT NULL DEFAULT 'OTHER',
  "screen_brand_other" TEXT,
  "visibility" "StoreProfileVisibility" NOT NULL DEFAULT 'PRIVATE',
  "cover_object_key" TEXT,
  "updated_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "store_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "store_profiles_ownership_id_key" UNIQUE ("ownership_id"),
  CONSTRAINT "store_profiles_ownership_id_fkey"
    FOREIGN KEY ("ownership_id") REFERENCES "store_ownerships"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "store_profiles_updated_by_user_id_fkey"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "store_profiles_visibility_idx" ON "store_profiles"("visibility");

CREATE TABLE "store_profile_photos" (
  "id" TEXT NOT NULL,
  "profile_id" UUID NOT NULL,
  "object_key" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "store_profile_photos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "store_profile_photos_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "store_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "store_profile_photos_profile_id_sort_order_idx"
  ON "store_profile_photos"("profile_id", "sort_order");

CREATE TABLE "home_banners" (
  "id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "image_object_key" TEXT,
  "href" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "starts_at" TIMESTAMPTZ(6),
  "ends_at" TIMESTAMPTZ(6),
  "updated_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "home_banners_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "home_banners_updated_by_user_id_fkey"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "home_banners_active_sort_order_idx" ON "home_banners"("active", "sort_order");

CREATE TABLE "store_banner_ad_requests" (
  "id" UUID NOT NULL,
  "ownership_id" UUID NOT NULL,
  "requested_by_user_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "image_object_key" TEXT,
  "href" TEXT,
  "memo" TEXT,
  "status" "StoreBannerAdStatus" NOT NULL DEFAULT 'REQUESTED',
  "starts_at" TIMESTAMPTZ(6),
  "ends_at" TIMESTAMPTZ(6),
  "admin_note" TEXT,
  "reviewed_by_admin_user_id" UUID,
  "reviewed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "store_banner_ad_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "store_banner_ad_requests_ownership_id_fkey"
    FOREIGN KEY ("ownership_id") REFERENCES "store_ownerships"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "store_banner_ad_requests_requested_by_user_id_fkey"
    FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "store_banner_ad_requests_reviewed_by_admin_user_id_fkey"
    FOREIGN KEY ("reviewed_by_admin_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "store_banner_ad_requests_status_created_at_idx"
  ON "store_banner_ad_requests"("status", "created_at" DESC);
CREATE INDEX "store_banner_ad_requests_ownership_id_created_at_idx"
  ON "store_banner_ad_requests"("ownership_id", "created_at" DESC);

CREATE TABLE "coin_gifts" (
  "id" UUID NOT NULL,
  "from_user_id" UUID NOT NULL,
  "to_user_id" UUID NOT NULL,
  "amount" DECIMAL(18,4) NOT NULL,
  "message" TEXT,
  "idempotency_key" TEXT NOT NULL,
  "sender_tx_id" UUID NOT NULL,
  "receiver_tx_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coin_gifts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "coin_gifts_idempotency_key_key" UNIQUE ("idempotency_key"),
  CONSTRAINT "coin_gifts_sender_tx_id_key" UNIQUE ("sender_tx_id"),
  CONSTRAINT "coin_gifts_receiver_tx_id_key" UNIQUE ("receiver_tx_id"),
  CONSTRAINT "coin_gifts_from_user_id_fkey"
    FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "coin_gifts_to_user_id_fkey"
    FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "coin_gifts_from_user_id_created_at_idx"
  ON "coin_gifts"("from_user_id", "created_at" DESC);
CREATE INDEX "coin_gifts_to_user_id_created_at_idx"
  ON "coin_gifts"("to_user_id", "created_at" DESC);

CREATE TABLE "reward_grants" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "kind" "RewardGrantKind" NOT NULL,
  "milestone_key" TEXT NOT NULL,
  "amount" DECIMAL(18,4) NOT NULL,
  "issuance_id" UUID,
  "idempotency_key" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reward_grants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reward_grants_issuance_id_key" UNIQUE ("issuance_id"),
  CONSTRAINT "reward_grants_idempotency_key_key" UNIQUE ("idempotency_key"),
  CONSTRAINT "reward_grants_user_id_kind_milestone_key_key" UNIQUE ("user_id", "kind", "milestone_key"),
  CONSTRAINT "reward_grants_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "reward_grants_user_id_created_at_idx"
  ON "reward_grants"("user_id", "created_at" DESC);

CREATE TABLE "daily_attendance_check_ins" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "kst_date" VARCHAR(10) NOT NULL,
  "amount" DECIMAL(18,4) NOT NULL,
  "grant_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "daily_attendance_check_ins_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "daily_attendance_check_ins_grant_id_key" UNIQUE ("grant_id"),
  CONSTRAINT "daily_attendance_check_ins_user_id_kst_date_key" UNIQUE ("user_id", "kst_date"),
  CONSTRAINT "daily_attendance_check_ins_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "daily_attendance_check_ins_grant_id_fkey"
    FOREIGN KEY ("grant_id") REFERENCES "reward_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "daily_attendance_check_ins_kst_date_idx"
  ON "daily_attendance_check_ins"("kst_date");
