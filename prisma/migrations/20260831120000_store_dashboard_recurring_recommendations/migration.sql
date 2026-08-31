-- Store growth loop: recurring join schedules + join FK (additive only)

CREATE TYPE "RecurringJoinCadence" AS ENUM ('WEEKLY');
CREATE TYPE "RecurringJoinScheduleStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DELETED');
CREATE TYPE "RecurringJoinOccurrenceStatus" AS ENUM ('CREATED', 'SKIPPED', 'FAILED');

CREATE TABLE "recurring_join_schedules" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "store_ownership_id" UUID NOT NULL,
    "golf_facility_id" UUID NOT NULL,
    "cadence" "RecurringJoinCadence" NOT NULL DEFAULT 'WEEKLY',
    "day_of_week" INTEGER NOT NULL,
    "start_time_local" VARCHAR(5) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
    "target_male_count" INTEGER NOT NULL,
    "target_female_count" INTEGER NOT NULL,
    "minimum_players" INTEGER NOT NULL,
    "matching_reward_target" "MatchingRewardTarget" NOT NULL,
    "reward_per_participant" DECIMAL(18,4) NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "recruit_closes_hours_before" INTEGER NOT NULL DEFAULT 3,
    "status" "RecurringJoinScheduleStatus" NOT NULL DEFAULT 'ACTIVE',
    "next_run_at" TIMESTAMPTZ(6),
    "last_run_at" TIMESTAMPTZ(6),
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "recurring_join_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recurring_join_skips" (
    "id" UUID NOT NULL,
    "schedule_id" UUID NOT NULL,
    "occurrence_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_join_skips_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recurring_join_occurrences" (
    "id" UUID NOT NULL,
    "schedule_id" UUID NOT NULL,
    "occurrence_date" DATE NOT NULL,
    "join_id" UUID,
    "status" "RecurringJoinOccurrenceStatus" NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_join_occurrences_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "joins" ADD COLUMN IF NOT EXISTS "recurring_schedule_id" UUID;
ALTER TABLE "joins" ADD COLUMN IF NOT EXISTS "recurring_occurrence_date" DATE;

CREATE INDEX "recurring_join_schedules_status_next_run_at_idx" ON "recurring_join_schedules"("status", "next_run_at");
CREATE INDEX "recurring_join_schedules_owner_user_id_status_idx" ON "recurring_join_schedules"("owner_user_id", "status");
CREATE INDEX "recurring_join_schedules_store_ownership_id_status_idx" ON "recurring_join_schedules"("store_ownership_id", "status");

CREATE UNIQUE INDEX "recurring_join_skips_schedule_id_occurrence_date_key" ON "recurring_join_skips"("schedule_id", "occurrence_date");
CREATE UNIQUE INDEX "recurring_join_occurrences_join_id_key" ON "recurring_join_occurrences"("join_id");
CREATE UNIQUE INDEX "recurring_join_occurrences_schedule_id_occurrence_date_key" ON "recurring_join_occurrences"("schedule_id", "occurrence_date");
CREATE INDEX "recurring_join_occurrences_status_created_at_idx" ON "recurring_join_occurrences"("status", "created_at");

CREATE UNIQUE INDEX "joins_recurring_schedule_id_recurring_occurrence_date_key" ON "joins"("recurring_schedule_id", "recurring_occurrence_date");

ALTER TABLE "recurring_join_schedules" ADD CONSTRAINT "recurring_join_schedules_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recurring_join_schedules" ADD CONSTRAINT "recurring_join_schedules_store_ownership_id_fkey" FOREIGN KEY ("store_ownership_id") REFERENCES "store_ownerships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recurring_join_schedules" ADD CONSTRAINT "recurring_join_schedules_golf_facility_id_fkey" FOREIGN KEY ("golf_facility_id") REFERENCES "golf_facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recurring_join_skips" ADD CONSTRAINT "recurring_join_skips_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "recurring_join_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recurring_join_occurrences" ADD CONSTRAINT "recurring_join_occurrences_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "recurring_join_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "joins" ADD CONSTRAINT "joins_recurring_schedule_id_fkey" FOREIGN KEY ("recurring_schedule_id") REFERENCES "recurring_join_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
