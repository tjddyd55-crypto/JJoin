-- Join room character + profile screen handicap
CREATE TYPE "JoinParticipantSkillMode" AS ENUM ('ANY', 'BEGINNER_OK', 'HANDICAP_RANGE');
CREATE TYPE "JoinGameStyle" AS ENUM ('FRIENDLY', 'LIGHT_GAME', 'DECIDE_ON_SITE');
CREATE TYPE "JoinAfterPlan" AS ENUM ('NONE', 'MEAL_OR_DRINK', 'DECIDE_ON_SITE');

ALTER TABLE "user_sport_profiles" ADD COLUMN "screen_handicap" INTEGER;

ALTER TABLE "joins" ADD COLUMN "participant_skill_mode" "JoinParticipantSkillMode" NOT NULL DEFAULT 'ANY';
ALTER TABLE "joins" ADD COLUMN "min_screen_handicap" INTEGER;
ALTER TABLE "joins" ADD COLUMN "max_screen_handicap" INTEGER;
ALTER TABLE "joins" ADD COLUMN "game_style" "JoinGameStyle" NOT NULL DEFAULT 'FRIENDLY';
ALTER TABLE "joins" ADD COLUMN "game_memo" VARCHAR(500);
ALTER TABLE "joins" ADD COLUMN "after_plan" "JoinAfterPlan" NOT NULL DEFAULT 'NONE';
ALTER TABLE "joins" ADD COLUMN "after_memo" VARCHAR(500);
