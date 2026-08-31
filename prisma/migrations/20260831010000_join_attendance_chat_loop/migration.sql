-- Attendance + chat loop: urgent vacancy, attendance intent, ephemeral chat, invitations

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'URGENT_JOIN_OPENED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'JOIN_ATTENDANCE_CONFIRM_REQUIRED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'JOIN_INVITATION';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'JOIN_CHAT_SYSTEM';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'JOIN_STARTING_SOON';

DO $$ BEGIN
  CREATE TYPE "AttendanceIntent" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "JoinChatRoomStatus" AS ENUM ('ACTIVE', 'READ_ONLY', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "JoinChatMessageKind" AS ENUM ('TEXT', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "JoinInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "joins" ADD COLUMN IF NOT EXISTS "is_urgent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "joins" ADD COLUMN IF NOT EXISTS "urgent_until" TIMESTAMPTZ(6);
ALTER TABLE "joins" ADD COLUMN IF NOT EXISTS "urgent_seats" INTEGER;

CREATE INDEX IF NOT EXISTS "joins_is_urgent_start_at_idx" ON "joins"("is_urgent", "start_at");

ALTER TABLE "join_participants"
  ADD COLUMN IF NOT EXISTS "attendance_intent" "AttendanceIntent" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "join_participants"
  ADD COLUMN IF NOT EXISTS "attendance_intent_at" TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "join_participants_join_id_attendance_intent_idx"
  ON "join_participants"("join_id", "attendance_intent");

CREATE TABLE IF NOT EXISTS "join_chat_rooms" (
    "id" UUID NOT NULL,
    "join_id" UUID NOT NULL,
    "status" "JoinChatRoomStatus" NOT NULL DEFAULT 'ACTIVE',
    "closed_at" TIMESTAMPTZ(6),
    "hide_after" TIMESTAMPTZ(6),
    "purge_after" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "join_chat_rooms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "join_chat_rooms_join_id_key" ON "join_chat_rooms"("join_id");
CREATE INDEX IF NOT EXISTS "join_chat_rooms_status_purge_after_idx"
  ON "join_chat_rooms"("status", "purge_after");

CREATE TABLE IF NOT EXISTS "join_chat_members" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ(6),

    CONSTRAINT "join_chat_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "join_chat_members_room_id_user_id_key"
  ON "join_chat_members"("room_id", "user_id");
CREATE INDEX IF NOT EXISTS "join_chat_members_user_id_idx" ON "join_chat_members"("user_id");

CREATE TABLE IF NOT EXISTS "join_chat_messages" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "sender_user_id" UUID,
    "kind" "JoinChatMessageKind" NOT NULL DEFAULT 'TEXT',
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "join_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "join_chat_messages_room_id_created_at_idx"
  ON "join_chat_messages"("room_id", "created_at");

CREATE TABLE IF NOT EXISTS "join_invitations" (
    "id" UUID NOT NULL,
    "join_id" UUID NOT NULL,
    "inviter_user_id" UUID NOT NULL,
    "invitee_user_id" UUID NOT NULL,
    "status" "JoinInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMPTZ(6),

    CONSTRAINT "join_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "join_invitations_join_id_invitee_user_id_key"
  ON "join_invitations"("join_id", "invitee_user_id");
CREATE INDEX IF NOT EXISTS "join_invitations_invitee_user_id_status_created_at_idx"
  ON "join_invitations"("invitee_user_id", "status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "join_invitations_inviter_user_id_created_at_idx"
  ON "join_invitations"("inviter_user_id", "created_at" DESC);

DO $$ BEGIN
  ALTER TABLE "join_chat_rooms"
    ADD CONSTRAINT "join_chat_rooms_join_id_fkey"
    FOREIGN KEY ("join_id") REFERENCES "joins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "join_chat_members"
    ADD CONSTRAINT "join_chat_members_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "join_chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "join_chat_members"
    ADD CONSTRAINT "join_chat_members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "join_chat_messages"
    ADD CONSTRAINT "join_chat_messages_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "join_chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "join_chat_messages"
    ADD CONSTRAINT "join_chat_messages_sender_user_id_fkey"
    FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "join_invitations"
    ADD CONSTRAINT "join_invitations_join_id_fkey"
    FOREIGN KEY ("join_id") REFERENCES "joins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "join_invitations"
    ADD CONSTRAINT "join_invitations_inviter_user_id_fkey"
    FOREIGN KEY ("inviter_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "join_invitations"
    ADD CONSTRAINT "join_invitations_invitee_user_id_fkey"
    FOREIGN KEY ("invitee_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
