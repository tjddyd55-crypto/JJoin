-- Host recurring join: extend schedules for HOST_JOIN templates + ENDED status

CREATE TYPE "RecurringJoinScheduleKind" AS ENUM ('STORE_MATCHING', 'HOST_JOIN');

ALTER TYPE "RecurringJoinScheduleStatus" ADD VALUE IF NOT EXISTS 'ENDED';

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RECURRING_JOIN_OCCURRENCE_FAILED';

ALTER TABLE "recurring_join_schedules"
  ADD COLUMN IF NOT EXISTS "kind" "RecurringJoinScheduleKind" NOT NULL DEFAULT 'STORE_MATCHING',
  ADD COLUMN IF NOT EXISTS "join_template_json" JSONB,
  ADD COLUMN IF NOT EXISTS "recurrence_start_date" DATE,
  ADD COLUMN IF NOT EXISTS "recurrence_end_date" DATE,
  ADD COLUMN IF NOT EXISTS "max_occurrences" INTEGER,
  ADD COLUMN IF NOT EXISTS "occurrences_created_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "recurring_join_schedules" ALTER COLUMN "store_ownership_id" DROP NOT NULL;
ALTER TABLE "recurring_join_schedules" ALTER COLUMN "golf_facility_id" DROP NOT NULL;
ALTER TABLE "recurring_join_schedules" ALTER COLUMN "target_male_count" DROP NOT NULL;
ALTER TABLE "recurring_join_schedules" ALTER COLUMN "target_female_count" DROP NOT NULL;
ALTER TABLE "recurring_join_schedules" ALTER COLUMN "minimum_players" DROP NOT NULL;
ALTER TABLE "recurring_join_schedules" ALTER COLUMN "matching_reward_target" DROP NOT NULL;
ALTER TABLE "recurring_join_schedules" ALTER COLUMN "reward_per_participant" DROP NOT NULL;
