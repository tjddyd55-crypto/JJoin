-- AlterEnum
ALTER TYPE "CoinTxType" ADD VALUE IF NOT EXISTS 'DIRECT_MESSAGE_FEE';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DIRECT_MESSAGE_RECEIVED';

-- CreateTable
CREATE TABLE "message_policy_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "premium_only" BOOLEAN NOT NULL DEFAULT false,
    "coin_cost_per_message" INTEGER NOT NULL DEFAULT 0,
    "friends_only" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "message_policy_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_blocks" (
    "id" UUID NOT NULL,
    "blocker_user_id" UUID NOT NULL,
    "blocked_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_conversations" (
    "id" UUID NOT NULL,
    "user_low_id" UUID NOT NULL,
    "user_high_id" UUID NOT NULL,
    "last_message_at" TIMESTAMPTZ(6),
    "last_message_preview" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "direct_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_conversation_members" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "last_read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_conversation_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "fee_tx_id" UUID,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_blocks_blocker_user_id_blocked_user_id_key" ON "user_blocks"("blocker_user_id", "blocked_user_id");

-- CreateIndex
CREATE INDEX "user_blocks_blocked_user_id_idx" ON "user_blocks"("blocked_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "direct_conversations_user_low_id_user_high_id_key" ON "direct_conversations"("user_low_id", "user_high_id");

-- CreateIndex
CREATE INDEX "direct_conversations_last_message_at_idx" ON "direct_conversations"("last_message_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "direct_conversation_members_conversation_id_user_id_key" ON "direct_conversation_members"("conversation_id", "user_id");

-- CreateIndex
CREATE INDEX "direct_conversation_members_user_id_last_read_at_idx" ON "direct_conversation_members"("user_id", "last_read_at");

-- CreateIndex
CREATE UNIQUE INDEX "direct_messages_idempotency_key_key" ON "direct_messages"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "direct_messages_fee_tx_id_key" ON "direct_messages"("fee_tx_id");

-- CreateIndex
CREATE INDEX "direct_messages_conversation_id_created_at_idx" ON "direct_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "direct_messages_sender_user_id_created_at_idx" ON "direct_messages"("sender_user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "message_policy_settings" ADD CONSTRAINT "message_policy_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_user_id_fkey" FOREIGN KEY ("blocker_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_user_id_fkey" FOREIGN KEY ("blocked_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_conversation_members" ADD CONSTRAINT "direct_conversation_members_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "direct_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_conversation_members" ADD CONSTRAINT "direct_conversation_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "direct_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed DEV-safe default policy (free, all members).
INSERT INTO "message_policy_settings" ("id", "enabled", "premium_only", "coin_cost_per_message", "friends_only", "updated_at")
VALUES ('default', true, false, 0, false, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
