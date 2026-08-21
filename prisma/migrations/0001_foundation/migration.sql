-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "IdentityStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "SocialProvider" AS ENUM ('KAKAO', 'NAVER', 'GOOGLE');

-- CreateEnum
CREATE TYPE "JoinStatus" AS ENUM ('DRAFT', 'OPEN', 'FULL', 'CONFIRMED', 'IN_PROGRESS', 'SETTLING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JoinMethod" AS ENUM ('OPEN', 'APPROVAL');

-- CreateEnum
CREATE TYPE "ParticipationStatus" AS ENUM ('APPLIED', 'APPROVED', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'LEFT_EARLY', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('HOST', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "RewardStatus" AS ENUM ('NOT_ELIGIBLE', 'HELD', 'PENDING_CONFIRMATION', 'PAID', 'AUTO_PAID', 'DISPUTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CoinHoldStatus" AS ENUM ('OPEN', 'PARTIALLY_RELEASED', 'RELEASED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CoinTxType" AS ENUM ('ROOM_CREATION_FEE', 'JOIN_REWARD_HOLD', 'JOIN_REWARD_RELEASE', 'JOIN_REWARD_TRANSFER', 'JOIN_REWARD_REFUND', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CoinTxDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('AVATAR', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "identity_status" "IdentityStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "country_code" CHAR(2) NOT NULL DEFAULT 'KR',
    "locale" TEXT NOT NULL DEFAULT 'ko-KR',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" UUID NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatar_asset_id" UUID,
    "gender" TEXT,
    "age_band" TEXT,
    "region_code" TEXT,
    "region_label" TEXT,
    "bio" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "SocialProvider" NOT NULL,
    "provider_subject" TEXT NOT NULL,
    "provider_email" TEXT,
    "linked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMPTZ(6),

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_verifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_verification_id" TEXT,
    "status" "IdentityStatus" NOT NULL DEFAULT 'PENDING',
    "ci_hash" TEXT,
    "verified_at" TIMESTAMPTZ(6),
    "verified_name_masked" TEXT,
    "birth_date" DATE,
    "phone_encrypted" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "identity_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "kind" "MediaKind" NOT NULL DEFAULT 'AVATAR',
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_i18n_key" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sport_rules" (
    "sport_id" UUID NOT NULL,
    "duration_strategy" TEXT NOT NULL,
    "duration_param_json" JSONB NOT NULL,
    "default_join_method" "JoinMethod" NOT NULL DEFAULT 'OPEN',
    "metadata" JSONB,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sport_rules_pkey" PRIMARY KEY ("sport_id")
);

-- CreateTable
CREATE TABLE "user_sport_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "sport_id" UUID NOT NULL,
    "skill_level" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_sport_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" UUID NOT NULL,
    "sport_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_place_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "road_address" TEXT,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "phone" TEXT,
    "country_code" CHAR(2) NOT NULL DEFAULT 'KR',
    "region" TEXT,
    "timezone" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "joins" (
    "id" UUID NOT NULL,
    "sport_id" UUID NOT NULL,
    "venue_id" UUID NOT NULL,
    "host_user_id" UUID NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "status" "JoinStatus" NOT NULL DEFAULT 'DRAFT',
    "join_method" "JoinMethod" NOT NULL DEFAULT 'OPEN',
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "scheduled_end_at" TIMESTAMPTZ(6) NOT NULL,
    "planned_player_count" INTEGER NOT NULL,
    "confirmed_player_count" INTEGER NOT NULL DEFAULT 1,
    "reward_per_participant" DECIMAL(18,4) NOT NULL,
    "coin_asset_id" UUID NOT NULL,
    "room_creation_fee_amount" DECIMAL(18,4) NOT NULL,
    "reward_hold_total_amount" DECIMAL(18,4) NOT NULL,
    "cost_share_type" TEXT,
    "country_code" CHAR(2) NOT NULL DEFAULT 'KR',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
    "confirmed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "joins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "join_requirements" (
    "id" UUID NOT NULL,
    "join_id" UUID NOT NULL,
    "requirement_type" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value_json" JSONB NOT NULL,
    "target_count" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "join_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "join_options" (
    "id" UUID NOT NULL,
    "join_id" UUID NOT NULL,
    "option_key" TEXT NOT NULL,
    "option_value_json" JSONB NOT NULL,

    CONSTRAINT "join_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "join_participants" (
    "id" UUID NOT NULL,
    "join_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'PARTICIPANT',
    "participation_status" "ParticipationStatus" NOT NULL DEFAULT 'APPLIED',
    "party_size" INTEGER NOT NULL DEFAULT 1,
    "applied_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMPTZ(6),
    "confirmed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),

    CONSTRAINT "join_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_settlements" (
    "id" UUID NOT NULL,
    "join_id" UUID NOT NULL,
    "join_participant_id" UUID NOT NULL,
    "coin_asset_id" UUID NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "reward_status" "RewardStatus" NOT NULL DEFAULT 'HELD',
    "hold_id" UUID,
    "settlement_available_at" TIMESTAMPTZ(6) NOT NULL,
    "auto_pay_at" TIMESTAMPTZ(6) NOT NULL,
    "held_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),
    "disputed_at" TIMESTAMPTZ(6),
    "refunded_at" TIMESTAMPTZ(6),
    "paid_tx_id" UUID,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reward_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_assets" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_i18n_key" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "coin_asset_id" UUID NOT NULL,
    "available_balance" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "held_balance" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_transactions" (
    "id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "coin_asset_id" UUID NOT NULL,
    "type" "CoinTxType" NOT NULL,
    "direction" "CoinTxDirection" NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "balance_after_available" DECIMAL(18,4) NOT NULL,
    "balance_after_held" DECIMAL(18,4) NOT NULL,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_holds" (
    "id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "coin_asset_id" UUID NOT NULL,
    "join_id" UUID,
    "amount" DECIMAL(18,4) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "CoinHoldStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMPTZ(6),
    "refunded_at" TIMESTAMPTZ(6),

    CONSTRAINT "coin_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "join_id" UUID NOT NULL,
    "reporter_user_id" UUID NOT NULL,
    "subject_participant_id" UUID,
    "reason_code" TEXT NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_nickname_key" ON "user_profiles"("nickname");

-- CreateIndex
CREATE INDEX "social_accounts_user_id_idx" ON "social_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_provider_provider_subject_key" ON "social_accounts"("provider", "provider_subject");

-- CreateIndex
CREATE INDEX "identity_verifications_user_id_status_idx" ON "identity_verifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "media_assets_owner_user_id_idx" ON "media_assets"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sports_code_key" ON "sports"("code");

-- CreateIndex
CREATE UNIQUE INDEX "user_sport_profiles_user_id_sport_id_key" ON "user_sport_profiles"("user_id", "sport_id");

-- CreateIndex
CREATE INDEX "venues_sport_id_latitude_longitude_idx" ON "venues"("sport_id", "latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "venues_provider_provider_place_id_key" ON "venues"("provider", "provider_place_id");

-- CreateIndex
CREATE INDEX "joins_venue_id_start_at_idx" ON "joins"("venue_id", "start_at");

-- CreateIndex
CREATE INDEX "joins_status_start_at_idx" ON "joins"("status", "start_at");

-- CreateIndex
CREATE INDEX "joins_host_user_id_start_at_idx" ON "joins"("host_user_id", "start_at");

-- CreateIndex
CREATE INDEX "joins_sport_id_start_at_idx" ON "joins"("sport_id", "start_at");

-- CreateIndex
CREATE INDEX "join_requirements_join_id_idx" ON "join_requirements"("join_id");

-- CreateIndex
CREATE UNIQUE INDEX "join_options_join_id_option_key_key" ON "join_options"("join_id", "option_key");

-- CreateIndex
CREATE INDEX "join_participants_user_id_idx" ON "join_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "join_participants_join_id_user_id_key" ON "join_participants"("join_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "reward_settlements_join_participant_id_key" ON "reward_settlements"("join_participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "reward_settlements_idempotency_key_key" ON "reward_settlements"("idempotency_key");

-- CreateIndex
CREATE INDEX "reward_settlements_reward_status_auto_pay_at_idx" ON "reward_settlements"("reward_status", "auto_pay_at");

-- CreateIndex
CREATE INDEX "reward_settlements_join_id_idx" ON "reward_settlements"("join_id");

-- CreateIndex
CREATE UNIQUE INDEX "coin_assets_code_key" ON "coin_assets"("code");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_coin_asset_id_key" ON "wallets"("user_id", "coin_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "coin_transactions_idempotency_key_key" ON "coin_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "coin_transactions_wallet_id_created_at_idx" ON "coin_transactions"("wallet_id", "created_at");

-- CreateIndex
CREATE INDEX "coin_transactions_ref_type_ref_id_idx" ON "coin_transactions"("ref_type", "ref_id");

-- CreateIndex
CREATE INDEX "coin_holds_wallet_id_status_idx" ON "coin_holds"("wallet_id", "status");

-- CreateIndex
CREATE INDEX "coin_holds_join_id_idx" ON "coin_holds"("join_id");

-- CreateIndex
CREATE INDEX "reports_join_id_status_idx" ON "reports"("join_id", "status");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_avatar_asset_id_fkey" FOREIGN KEY ("avatar_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sport_rules" ADD CONSTRAINT "sport_rules_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sport_profiles" ADD CONSTRAINT "user_sport_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sport_profiles" ADD CONSTRAINT "user_sport_profiles_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "joins" ADD CONSTRAINT "joins_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "joins" ADD CONSTRAINT "joins_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "joins" ADD CONSTRAINT "joins_host_user_id_fkey" FOREIGN KEY ("host_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "joins" ADD CONSTRAINT "joins_coin_asset_id_fkey" FOREIGN KEY ("coin_asset_id") REFERENCES "coin_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_requirements" ADD CONSTRAINT "join_requirements_join_id_fkey" FOREIGN KEY ("join_id") REFERENCES "joins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_options" ADD CONSTRAINT "join_options_join_id_fkey" FOREIGN KEY ("join_id") REFERENCES "joins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_participants" ADD CONSTRAINT "join_participants_join_id_fkey" FOREIGN KEY ("join_id") REFERENCES "joins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_participants" ADD CONSTRAINT "join_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_settlements" ADD CONSTRAINT "reward_settlements_join_participant_id_fkey" FOREIGN KEY ("join_participant_id") REFERENCES "join_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_settlements" ADD CONSTRAINT "reward_settlements_coin_asset_id_fkey" FOREIGN KEY ("coin_asset_id") REFERENCES "coin_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_settlements" ADD CONSTRAINT "reward_settlements_hold_id_fkey" FOREIGN KEY ("hold_id") REFERENCES "coin_holds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_settlements" ADD CONSTRAINT "reward_settlements_paid_tx_id_fkey" FOREIGN KEY ("paid_tx_id") REFERENCES "coin_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_coin_asset_id_fkey" FOREIGN KEY ("coin_asset_id") REFERENCES "coin_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_coin_asset_id_fkey" FOREIGN KEY ("coin_asset_id") REFERENCES "coin_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_holds" ADD CONSTRAINT "coin_holds_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_holds" ADD CONSTRAINT "coin_holds_coin_asset_id_fkey" FOREIGN KEY ("coin_asset_id") REFERENCES "coin_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_holds" ADD CONSTRAINT "coin_holds_join_id_fkey" FOREIGN KEY ("join_id") REFERENCES "joins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_join_id_fkey" FOREIGN KEY ("join_id") REFERENCES "joins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_subject_participant_id_fkey" FOREIGN KEY ("subject_participant_id") REFERENCES "join_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

