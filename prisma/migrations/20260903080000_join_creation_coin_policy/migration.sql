-- Join creation coin policy (admin) + join snapshot columns.
-- Defaults preserve previous STANDARD fee = 2 for all roles.

CREATE TABLE IF NOT EXISTS "join_creation_coin_policy_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "general_enabled" BOOLEAN NOT NULL DEFAULT true,
    "general_cost" INTEGER NOT NULL DEFAULT 2,
    "premium_enabled" BOOLEAN NOT NULL DEFAULT true,
    "premium_cost" INTEGER NOT NULL DEFAULT 2,
    "store_owner_enabled" BOOLEAN NOT NULL DEFAULT true,
    "store_owner_cost" INTEGER NOT NULL DEFAULT 2,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "join_creation_coin_policy_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "join_creation_coin_policy_settings" ("id")
VALUES ('default')
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "joins" ADD COLUMN IF NOT EXISTS "creator_user_type" TEXT;
ALTER TABLE "joins" ADD COLUMN IF NOT EXISTS "creation_coin_enabled" BOOLEAN;