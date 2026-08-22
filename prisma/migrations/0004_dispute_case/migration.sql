-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED');

CREATE TYPE "DisputeResolution" AS ENUM ('PAY_PARTICIPANT', 'REFUND_HOST');

CREATE TYPE "DisputeReasonType" AS ENUM ('LEFT_EARLY', 'DISPUTED');

-- CreateTable
CREATE TABLE "dispute_cases" (
    "id" UUID NOT NULL,
    "join_id" UUID NOT NULL,
    "join_participant_id" UUID NOT NULL,
    "settlement_id" UUID NOT NULL,
    "opened_by_user_id" UUID NOT NULL,
    "reason_type" "DisputeReasonType" NOT NULL,
    "host_statement" TEXT,
    "participant_statement" TEXT,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" "DisputeResolution",
    "resolved_by_admin_user_id" UUID,
    "admin_note" TEXT,
    "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "under_review_at" TIMESTAMPTZ(6),
    "participant_statement_at" TIMESTAMPTZ(6),
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "dispute_cases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dispute_cases_join_participant_id_key" ON "dispute_cases"("join_participant_id");

CREATE UNIQUE INDEX "dispute_cases_settlement_id_key" ON "dispute_cases"("settlement_id");

CREATE INDEX "dispute_cases_status_opened_at_idx" ON "dispute_cases"("status", "opened_at");

CREATE INDEX "dispute_cases_join_id_idx" ON "dispute_cases"("join_id");

ALTER TABLE "dispute_cases" ADD CONSTRAINT "dispute_cases_join_id_fkey" FOREIGN KEY ("join_id") REFERENCES "joins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dispute_cases" ADD CONSTRAINT "dispute_cases_join_participant_id_fkey" FOREIGN KEY ("join_participant_id") REFERENCES "join_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dispute_cases" ADD CONSTRAINT "dispute_cases_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "reward_settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dispute_cases" ADD CONSTRAINT "dispute_cases_opened_by_user_id_fkey" FOREIGN KEY ("opened_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "dispute_cases" ADD CONSTRAINT "dispute_cases_resolved_by_admin_user_id_fkey" FOREIGN KEY ("resolved_by_admin_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
