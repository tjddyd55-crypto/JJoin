-- Coin Supply / Issuance foundation
-- Balance SSOT remains coin_transactions; coin_issuances is mint audit taxonomy.

ALTER TYPE "CoinTxType" ADD VALUE IF NOT EXISTS 'COIN_ISSUANCE';

DO $$ BEGIN
  CREATE TYPE "CoinIssuanceType" AS ENUM (
    'PURCHASE',
    'EVENT_REWARD',
    'SIGNUP_BONUS',
    'PROMOTION',
    'ADMIN_GRANT',
    'CUSTOMER_SUPPORT',
    'DEV_SEED',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CoinIssuanceStatus" AS ENUM ('COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "coin_issuances" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "coin_asset_id" UUID NOT NULL,
  "amount" DECIMAL(18,4) NOT NULL,
  "issuance_type" "CoinIssuanceType" NOT NULL,
  "reason" TEXT,
  "reference_type" TEXT,
  "reference_id" TEXT,
  "created_by_user_id" UUID,
  "ledger_tx_id" UUID NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "status" "CoinIssuanceStatus" NOT NULL DEFAULT 'COMPLETED',
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coin_issuances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "coin_issuances_ledger_tx_id_key" ON "coin_issuances"("ledger_tx_id");
CREATE UNIQUE INDEX IF NOT EXISTS "coin_issuances_idempotency_key_key" ON "coin_issuances"("idempotency_key");
CREATE INDEX IF NOT EXISTS "coin_issuances_created_at_idx" ON "coin_issuances"("created_at");
CREATE INDEX IF NOT EXISTS "coin_issuances_issuance_type_created_at_idx" ON "coin_issuances"("issuance_type", "created_at");
CREATE INDEX IF NOT EXISTS "coin_issuances_user_id_created_at_idx" ON "coin_issuances"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "coin_issuances_reference_type_reference_id_idx" ON "coin_issuances"("reference_type", "reference_id");
CREATE INDEX IF NOT EXISTS "coin_transactions_type_created_at_idx" ON "coin_transactions"("type", "created_at");

DO $$ BEGIN
  ALTER TABLE "coin_issuances"
    ADD CONSTRAINT "coin_issuances_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "coin_issuances"
    ADD CONSTRAINT "coin_issuances_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "coin_issuances"
    ADD CONSTRAINT "coin_issuances_coin_asset_id_fkey"
    FOREIGN KEY ("coin_asset_id") REFERENCES "coin_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "coin_issuances"
    ADD CONSTRAINT "coin_issuances_ledger_tx_id_fkey"
    FOREIGN KEY ("ledger_tx_id") REFERENCES "coin_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Backfill legacy ADMIN_ADJUSTMENT credits as DEV_SEED issuances (idempotent).
INSERT INTO "coin_issuances" (
  "id",
  "user_id",
  "coin_asset_id",
  "amount",
  "issuance_type",
  "reason",
  "reference_type",
  "reference_id",
  "created_by_user_id",
  "ledger_tx_id",
  "idempotency_key",
  "status",
  "metadata",
  "created_at"
)
SELECT
  gen_random_uuid(),
  w."user_id",
  t."coin_asset_id",
  t."amount",
  'DEV_SEED'::"CoinIssuanceType",
  'Legacy ADMIN_ADJUSTMENT backfill',
  t."ref_type",
  t."ref_id",
  NULL,
  t."id",
  'backfill:admin-adjustment:' || t."id"::text,
  'COMPLETED'::"CoinIssuanceStatus",
  jsonb_build_object('legacyType', 'ADMIN_ADJUSTMENT', 'source', 'migration_0007'),
  t."created_at"
FROM "coin_transactions" t
JOIN "wallets" w ON w."id" = t."wallet_id"
WHERE t."type" = 'ADMIN_ADJUSTMENT'
  AND t."direction" = 'CREDIT'
  AND NOT EXISTS (
    SELECT 1 FROM "coin_issuances" i WHERE i."ledger_tx_id" = t."id"
  );
