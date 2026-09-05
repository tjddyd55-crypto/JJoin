-- Billing / Premium / Join Creation Pricing integration

CREATE TYPE "JoinCreationBaseMode" AS ENUM ('FREE', 'PAID');
CREATE TYPE "JoinCreationBenefitOverrideMode" AS ENUM ('INHERIT', 'FREE', 'FIXED_FEE');
CREATE TYPE "PremiumPlanCode" AS ENUM ('PREMIUM_MONTHLY', 'PREMIUM_YEARLY');

ALTER TYPE "PaymentProductType" ADD VALUE IF NOT EXISTS 'PREMIUM_SUBSCRIPTION';

ALTER TABLE "join_creation_coin_policy_settings"
  ADD COLUMN IF NOT EXISTS "base_mode" "JoinCreationBaseMode" NOT NULL DEFAULT 'PAID',
  ADD COLUMN IF NOT EXISTS "base_fee_coin_amount" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS "owner_override" "JoinCreationBenefitOverrideMode" NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS "owner_fixed_fee_coin_amount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "premium_override" "JoinCreationBenefitOverrideMode" NOT NULL DEFAULT 'INHERIT',
  ADD COLUMN IF NOT EXISTS "premium_fixed_fee_coin_amount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pricing_updated_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "pricing_updated_by" UUID;

-- Migrate legacy per-role columns → new pricing model
UPDATE "join_creation_coin_policy_settings"
SET
  "base_mode" = CASE
    WHEN "general_enabled" = true AND "general_cost" > 0 THEN 'PAID'::"JoinCreationBaseMode"
    ELSE 'FREE'::"JoinCreationBaseMode"
  END,
  "base_fee_coin_amount" = CASE WHEN "general_enabled" = true THEN "general_cost" ELSE 0 END,
  "owner_override" = CASE
    WHEN "store_owner_enabled" = false OR "store_owner_cost" = 0 THEN 'FREE'::"JoinCreationBenefitOverrideMode"
    ELSE 'FIXED_FEE'::"JoinCreationBenefitOverrideMode"
  END,
  "owner_fixed_fee_coin_amount" = CASE
    WHEN "store_owner_enabled" = true AND "store_owner_cost" > 0 THEN "store_owner_cost"
    ELSE 0
  END,
  "premium_override" = CASE
    WHEN "premium_enabled" = false THEN 'INHERIT'::"JoinCreationBenefitOverrideMode"
    WHEN "premium_cost" = 0 THEN 'FREE'::"JoinCreationBenefitOverrideMode"
    ELSE 'FIXED_FEE'::"JoinCreationBenefitOverrideMode"
  END,
  "premium_fixed_fee_coin_amount" = CASE
    WHEN "premium_enabled" = true AND "premium_cost" > 0 THEN "premium_cost"
    ELSE 0
  END
WHERE "id" = 'default';

CREATE TABLE IF NOT EXISTS "premium_plan_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "monthly_enabled" BOOLEAN NOT NULL DEFAULT true,
  "monthly_price_krw" INTEGER NOT NULL DEFAULT 9900,
  "yearly_enabled" BOOLEAN NOT NULL DEFAULT true,
  "yearly_price_krw" INTEGER NOT NULL DEFAULT 99000,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "updated_by" UUID,
  CONSTRAINT "premium_plan_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "premium_plan_settings" ("id", "monthly_enabled", "monthly_price_krw", "yearly_enabled", "yearly_price_krw", "updated_at")
VALUES ('default', true, 9900, true, 99000, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "premium_billing_authorizations" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "customer_key" TEXT NOT NULL,
  "billing_key_encrypted" TEXT NOT NULL,
  "provider" "PaymentProviderKind" NOT NULL DEFAULT 'TOSS',
  "environment" "PaymentEnvironment" NOT NULL DEFAULT 'TEST',
  "card_company" TEXT,
  "card_number_masked" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "premium_billing_authorizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "premium_billing_authorizations_user_id_key"
  ON "premium_billing_authorizations"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "premium_billing_authorizations_customer_key_key"
  ON "premium_billing_authorizations"("customer_key");

ALTER TABLE "premium_billing_authorizations"
  ADD CONSTRAINT "premium_billing_authorizations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "premium_memberships"
  ADD COLUMN IF NOT EXISTS "plan" "PremiumPlanCode",
  ADD COLUMN IF NOT EXISTS "next_billing_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "billing_authorization_id" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "premium_memberships_billing_authorization_id_key"
  ON "premium_memberships"("billing_authorization_id");

ALTER TABLE "premium_memberships"
  ADD CONSTRAINT "premium_memberships_billing_authorization_id_fkey"
  FOREIGN KEY ("billing_authorization_id") REFERENCES "premium_billing_authorizations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "payment_webhook_events" (
  "id" UUID NOT NULL,
  "provider" "PaymentProviderKind" NOT NULL DEFAULT 'TOSS',
  "event_key" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "processed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_webhook_events_event_key_key"
  ON "payment_webhook_events"("event_key");

-- Coin products: align with 1 Coin = 100 KRW (deactivate legacy 1:1 products)
UPDATE "payment_products"
SET "active" = false, "updated_at" = CURRENT_TIMESTAMP
WHERE "type" = 'COIN_CHARGE'
  AND "code" IN ('COIN_10000', 'COIN_30000', 'COIN_50000');

INSERT INTO "payment_products" ("id", "code", "type", "name", "description", "price", "coin_amount", "premium_days", "active", "sort_order", "updated_at")
VALUES
  (gen_random_uuid(), 'COIN_10', 'COIN_CHARGE', '코인 10', '10 Coin 충전', 1000, 10, NULL, true, 10, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'COIN_30', 'COIN_CHARGE', '코인 30', '30 Coin 충전', 3000, 30, NULL, true, 20, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'COIN_50', 'COIN_CHARGE', '코인 50', '50 Coin 충전', 5000, 50, NULL, true, 30, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'COIN_100', 'COIN_CHARGE', '코인 100', '100 Coin 충전', 10000, 100, NULL, true, 40, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'COIN_300', 'COIN_CHARGE', '코인 300', '300 Coin 충전', 30000, 300, NULL, true, 50, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'COIN_500', 'COIN_CHARGE', '코인 500', '500 Coin 충전', 50000, 500, NULL, true, 60, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "price" = EXCLUDED."price",
  "coin_amount" = EXCLUDED."coin_amount",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "active" = EXCLUDED."active",
  "sort_order" = EXCLUDED."sort_order",
  "updated_at" = CURRENT_TIMESTAMP;
