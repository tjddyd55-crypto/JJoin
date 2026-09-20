-- Phase B: durable attendance streaks + configurable achievement milestone ladders.
-- Additive only: no DROP/TRUNCATE.

ALTER TABLE "reward_policy_settings"
  ADD COLUMN "host_milestones" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "participation_milestones" JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE "reward_policy_settings"
SET
  "host_milestones" = '[{"threshold":1,"amount":"3"},{"threshold":5,"amount":"10"},{"threshold":10,"amount":"20"},{"threshold":25,"amount":"50"}]'::jsonb,
  "participation_milestones" = '[{"threshold":1,"amount":"2"},{"threshold":5,"amount":"5"},{"threshold":10,"amount":"15"},{"threshold":25,"amount":"40"}]'::jsonb
WHERE "host_milestones" = '[]'::jsonb
   OR "participation_milestones" = '[]'::jsonb;

CREATE TABLE "user_attendance_stats" (
    "user_id" UUID NOT NULL,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "best_streak" INTEGER NOT NULL DEFAULT 0,
    "total_days" INTEGER NOT NULL DEFAULT 0,
    "last_check_in_kst_date" VARCHAR(10),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_attendance_stats_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "user_attendance_stats"
  ADD CONSTRAINT "user_attendance_stats_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
