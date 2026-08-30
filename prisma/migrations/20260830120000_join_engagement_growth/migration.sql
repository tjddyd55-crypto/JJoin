-- Growth engagement: alerts, bookmarks, facility follows, share slug, notification types

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'JOIN_ALERT_MATCH';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FOLLOWED_STORE_NEW_JOIN';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOOKMARK_JOIN_CLOSING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOOKMARK_JOIN_SPOT_LEFT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOOKMARK_JOIN_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOOKMARK_JOIN_CANCELLED';

CREATE TYPE "JoinAlertDateMode" AS ENUM ('TODAY', 'THIS_WEEK', 'SPECIFIC_DATE');
CREATE TYPE "JoinAlertTimeBand" AS ENUM ('ANY', 'MORNING', 'AFTERNOON', 'EVENING');

ALTER TABLE "joins" ADD COLUMN IF NOT EXISTS "share_slug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "joins_share_slug_key" ON "joins"("share_slug");

CREATE TABLE IF NOT EXISTS "join_alert_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" TEXT,
    "sido" TEXT,
    "sigungu" TEXT,
    "date_mode" "JoinAlertDateMode" NOT NULL DEFAULT 'TODAY',
    "specific_date" DATE,
    "time_band" "JoinAlertTimeBand" NOT NULL DEFAULT 'ANY',
    "joinable_only" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "join_alert_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "join_bookmarks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "join_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "join_bookmarks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "golf_facility_follows" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "golf_facility_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "golf_facility_follows_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "join_alert_subscriptions_user_id_enabled_idx"
  ON "join_alert_subscriptions"("user_id", "enabled");
CREATE INDEX IF NOT EXISTS "join_alert_subscriptions_enabled_sido_sigungu_idx"
  ON "join_alert_subscriptions"("enabled", "sido", "sigungu");

CREATE UNIQUE INDEX IF NOT EXISTS "join_bookmarks_user_id_join_id_key"
  ON "join_bookmarks"("user_id", "join_id");
CREATE INDEX IF NOT EXISTS "join_bookmarks_user_id_created_at_idx"
  ON "join_bookmarks"("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "join_bookmarks_join_id_idx"
  ON "join_bookmarks"("join_id");

CREATE UNIQUE INDEX IF NOT EXISTS "golf_facility_follows_user_id_golf_facility_id_key"
  ON "golf_facility_follows"("user_id", "golf_facility_id");
CREATE INDEX IF NOT EXISTS "golf_facility_follows_user_id_created_at_idx"
  ON "golf_facility_follows"("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "golf_facility_follows_golf_facility_id_idx"
  ON "golf_facility_follows"("golf_facility_id");

DO $$ BEGIN
  ALTER TABLE "join_alert_subscriptions"
    ADD CONSTRAINT "join_alert_subscriptions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "join_bookmarks"
    ADD CONSTRAINT "join_bookmarks_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "join_bookmarks"
    ADD CONSTRAINT "join_bookmarks_join_id_fkey"
    FOREIGN KEY ("join_id") REFERENCES "joins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "golf_facility_follows"
    ADD CONSTRAINT "golf_facility_follows_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "golf_facility_follows"
    ADD CONSTRAINT "golf_facility_follows_golf_facility_id_fkey"
    FOREIGN KEY ("golf_facility_id") REFERENCES "golf_facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
