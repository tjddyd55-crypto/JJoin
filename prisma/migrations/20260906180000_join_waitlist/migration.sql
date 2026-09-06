-- Join waitlist: extend participation lifecycle (FIFO waitlist + time-limited offers).

ALTER TYPE "ParticipationStatus" ADD VALUE IF NOT EXISTS 'WAITLISTED';
ALTER TYPE "ParticipationStatus" ADD VALUE IF NOT EXISTS 'OFFERED';
ALTER TYPE "ParticipationStatus" ADD VALUE IF NOT EXISTS 'WAITLIST_EXPIRED';

ALTER TABLE "join_participants"
  ADD COLUMN IF NOT EXISTS "offered_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "offer_expires_at" TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "join_participants_join_id_participation_status_applied_at_idx"
  ON "join_participants" ("join_id", "participation_status", "applied_at");

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'WAITLIST_OFFERED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'WAITLIST_PROMOTED';
