-- Additive unified notification / JOIN_CREATED audience preferences.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'JOIN_CREATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CLUB_JOIN_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CLUB_JOIN_REJECTED';

ALTER TYPE "NotificationOutboxStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "NotificationOutboxStatus" ADD VALUE IF NOT EXISTS 'RETRY';
ALTER TYPE "NotificationOutboxStatus" ADD VALUE IF NOT EXISTS 'FAILED_TERMINAL';

CREATE TYPE "ScreenNotificationRadius" AS ENUM ('KM_5', 'KM_10', 'KM_15', 'KM_30', 'SAME_ADMIN_REGION');
CREATE TYPE "FieldNotificationRegionMode" AS ENUM ('AUTO', 'CUSTOM');

ALTER TABLE "notification_preferences"
  ADD COLUMN IF NOT EXISTS "join_created_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "screen_radius_mode" "ScreenNotificationRadius" NOT NULL DEFAULT 'KM_15',
  ADD COLUMN IF NOT EXISTS "field_region_mode" "FieldNotificationRegionMode" NOT NULL DEFAULT 'AUTO',
  ADD COLUMN IF NOT EXISTS "field_regions" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "quiet_hours_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "quiet_hours_start_minutes" INTEGER,
  ADD COLUMN IF NOT EXISTS "quiet_hours_end_minutes" INTEGER;

CREATE INDEX IF NOT EXISTS "notification_preferences_screen_radius_mode_join_created_enabled_idx"
  ON "notification_preferences" ("screen_radius_mode", "join_created_enabled");

CREATE INDEX IF NOT EXISTS "notification_preferences_field_region_mode_join_created_enabled_idx"
  ON "notification_preferences" ("field_region_mode", "join_created_enabled");

CREATE INDEX IF NOT EXISTS "notifications_user_id_type_created_at_idx"
  ON "notifications" ("user_id", "type", "created_at" DESC);
