-- CreateEnum
CREATE TYPE "ClubVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "ClubJoinMode" AS ENUM ('APPROVAL', 'INSTANT');
CREATE TYPE "ClubMembershipRole" AS ENUM ('OWNER', 'MANAGER', 'MEMBER');
CREATE TYPE "ClubMembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'LEFT');
CREATE TYPE "ClubActivityType" AS ENUM ('SCREEN', 'FIELD', 'SCREEN_AND_FIELD');
CREATE TYPE "ClubAgeGroup" AS ENUM ('TWENTIES', 'THIRTIES', 'FORTIES', 'FIFTIES', 'SIXTIES_PLUS');
CREATE TYPE "ClubEventType" AS ENUM ('SCREEN', 'FIELD', 'OTHER');
CREATE TYPE "ClubEventStatus" AS ENUM ('DRAFT', 'OPEN', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ClubEventAttendanceResponse" AS ENUM ('ATTENDING', 'DECLINED', 'MAYBE', 'NO_RESPONSE');
CREATE TYPE "ClubEventAttendanceFinal" AS ENUM ('ATTENDED', 'NO_SHOW');
CREATE TYPE "ClubAccountingEntryType" AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE "ClubAccountingCategory" AS ENUM ('MEMBERSHIP_FEE', 'JOIN_FEE', 'PARTICIPATION_FEE', 'DONATION', 'OTHER_INCOME', 'GAME_FEE', 'MEAL', 'PRIZE', 'RENTAL', 'OTHER_EXPENSE');

-- AlterTable
ALTER TABLE "joins" ADD COLUMN "club_id" UUID;
ALTER TABLE "joins" ADD COLUMN "club_event_id" UUID;

-- CreateTable
CREATE TABLE "clubs" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cover_image_url" TEXT,
    "intro" TEXT,
    "region" TEXT NOT NULL,
    "activity_type" "ClubActivityType" NOT NULL,
    "primary_venue_id" UUID,
    "primary_venue_name" TEXT,
    "join_mode" "ClubJoinMode" NOT NULL DEFAULT 'APPROVAL',
    "visibility" "ClubVisibility" NOT NULL DEFAULT 'PUBLIC',
    "primary_age_group" "ClubAgeGroup",
    "invite_code" TEXT,
    "owner_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "club_memberships" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "ClubMembershipRole" NOT NULL DEFAULT 'MEMBER',
    "status" "ClubMembershipStatus" NOT NULL DEFAULT 'PENDING',
    "joined_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "club_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "club_events" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "event_type" "ClubEventType" NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6),
    "venue_name" TEXT NOT NULL,
    "venue_address" TEXT,
    "venue_id" UUID,
    "capacity" INTEGER,
    "response_deadline" TIMESTAMPTZ(6) NOT NULL,
    "memo" TEXT,
    "status" "ClubEventStatus" NOT NULL DEFAULT 'OPEN',
    "created_by_user_id" UUID NOT NULL,
    "attendance_finalized_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "club_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "club_event_attendances" (
    "id" UUID NOT NULL,
    "club_event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "response" "ClubEventAttendanceResponse" NOT NULL DEFAULT 'NO_RESPONSE',
    "final_status" "ClubEventAttendanceFinal",
    "responded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "club_event_attendances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "club_accounting_entries" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "entry_type" "ClubAccountingEntryType" NOT NULL,
    "category" "ClubAccountingCategory" NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "entry_date" DATE NOT NULL,
    "memo" TEXT,
    "club_event_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "club_accounting_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "club_notices" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "send_push" BOOLEAN NOT NULL DEFAULT false,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "club_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clubs_invite_code_key" ON "clubs"("invite_code");
CREATE INDEX "clubs_visibility_region_idx" ON "clubs"("visibility", "region");
CREATE INDEX "clubs_owner_user_id_idx" ON "clubs"("owner_user_id");

CREATE UNIQUE INDEX "club_memberships_club_id_user_id_key" ON "club_memberships"("club_id", "user_id");
CREATE INDEX "club_memberships_user_id_status_idx" ON "club_memberships"("user_id", "status");
CREATE INDEX "club_memberships_club_id_status_role_idx" ON "club_memberships"("club_id", "status", "role");

CREATE INDEX "club_events_club_id_status_starts_at_idx" ON "club_events"("club_id", "status", "starts_at");
CREATE INDEX "club_events_club_id_starts_at_idx" ON "club_events"("club_id", "starts_at");

CREATE UNIQUE INDEX "club_event_attendances_club_event_id_user_id_key" ON "club_event_attendances"("club_event_id", "user_id");
CREATE INDEX "club_event_attendances_club_event_id_response_idx" ON "club_event_attendances"("club_event_id", "response");
CREATE INDEX "club_event_attendances_user_id_idx" ON "club_event_attendances"("user_id");

CREATE INDEX "club_accounting_entries_club_id_entry_date_idx" ON "club_accounting_entries"("club_id", "entry_date");
CREATE INDEX "club_accounting_entries_club_id_entry_type_idx" ON "club_accounting_entries"("club_id", "entry_type");
CREATE INDEX "club_accounting_entries_club_event_id_idx" ON "club_accounting_entries"("club_event_id");

CREATE INDEX "club_notices_club_id_pinned_created_at_idx" ON "club_notices"("club_id", "pinned", "created_at");

CREATE UNIQUE INDEX "joins_club_event_id_key" ON "joins"("club_event_id");
CREATE INDEX "joins_club_id_idx" ON "joins"("club_id");

-- AddForeignKey
ALTER TABLE "joins" ADD CONSTRAINT "joins_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "joins" ADD CONSTRAINT "joins_club_event_id_fkey" FOREIGN KEY ("club_event_id") REFERENCES "club_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clubs" ADD CONSTRAINT "clubs_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_primary_venue_id_fkey" FOREIGN KEY ("primary_venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "club_events" ADD CONSTRAINT "club_events_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_events" ADD CONSTRAINT "club_events_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "club_events" ADD CONSTRAINT "club_events_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "club_event_attendances" ADD CONSTRAINT "club_event_attendances_club_event_id_fkey" FOREIGN KEY ("club_event_id") REFERENCES "club_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_event_attendances" ADD CONSTRAINT "club_event_attendances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "club_accounting_entries" ADD CONSTRAINT "club_accounting_entries_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_accounting_entries" ADD CONSTRAINT "club_accounting_entries_club_event_id_fkey" FOREIGN KEY ("club_event_id") REFERENCES "club_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "club_accounting_entries" ADD CONSTRAINT "club_accounting_entries_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "club_notices" ADD CONSTRAINT "club_notices_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_notices" ADD CONSTRAINT "club_notices_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CLUB_JOIN_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CLUB_EVENT_CREATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CLUB_NOTICE';
