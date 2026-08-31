-- Push token environment isolation, notification preferences, product analytics

CREATE TYPE "AppVariant" AS ENUM ('DEVELOPMENT', 'PRODUCTION');

CREATE TYPE "ProductEventType" AS ENUM (
  'SHARE_LINK_CREATED',
  'SHARE_LINK_OPENED',
  'SHARE_JOIN_CTA_CLICKED',
  'RECOMMENDATION_IMPRESSION',
  'RECOMMENDATION_CLICK',
  'RECOMMENDATION_JOINED',
  'FOLLOWED_STORE_NEW_JOIN_SENT',
  'FOLLOWED_STORE_JOIN_CLICK',
  'FOLLOWED_STORE_JOINED',
  'URGENT_JOIN_OPENED',
  'URGENT_JOIN_VIEWED',
  'URGENT_JOIN_JOINED',
  'URGENT_JOIN_FILLED',
  'RECURRING_OCCURRENCE_CREATED',
  'RECURRING_JOIN_FILLED',
  'JOIN_INVITATION_SENT',
  'JOIN_INVITATION_ACCEPTED'
);

ALTER TABLE "push_devices" ADD COLUMN "app_variant" "AppVariant" NOT NULL DEFAULT 'PRODUCTION';

CREATE INDEX "push_devices_user_id_active_app_variant_idx" ON "push_devices"("user_id", "active", "app_variant");

CREATE TABLE "notification_preferences" (
  "user_id" UUID NOT NULL,
  "join_alerts_enabled" BOOLEAN NOT NULL DEFAULT true,
  "followed_store_enabled" BOOLEAN NOT NULL DEFAULT true,
  "urgent_join_enabled" BOOLEAN NOT NULL DEFAULT true,
  "invitation_enabled" BOOLEAN NOT NULL DEFAULT true,
  "attendance_reminder_enabled" BOOLEAN NOT NULL DEFAULT true,
  "bookmark_updates_enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "notification_preferences"
  ADD CONSTRAINT "notification_preferences_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "product_events" (
  "id" UUID NOT NULL,
  "event_type" "ProductEventType" NOT NULL,
  "user_id" UUID,
  "join_id" UUID,
  "golf_facility_id" UUID,
  "source" TEXT NOT NULL DEFAULT 'mobile',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "product_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "product_events"
  ADD CONSTRAINT "product_events_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "product_events_event_type_created_at_idx" ON "product_events"("event_type", "created_at" DESC);
CREATE INDEX "product_events_user_id_created_at_idx" ON "product_events"("user_id", "created_at" DESC);
CREATE INDEX "product_events_join_id_created_at_idx" ON "product_events"("join_id", "created_at" DESC);
CREATE INDEX "product_events_golf_facility_id_created_at_idx" ON "product_events"("golf_facility_id", "created_at" DESC);
