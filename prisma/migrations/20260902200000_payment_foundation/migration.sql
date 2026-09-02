-- Payment foundation: products, payments, provider settings, premium membership

CREATE TYPE "PaymentProviderKind" AS ENUM ('TOSS');
CREATE TYPE "PaymentEnvironment" AS ENUM ('TEST', 'LIVE');
CREATE TYPE "PaymentProductType" AS ENUM ('COIN_CHARGE', 'PREMIUM_PASS');
CREATE TYPE "PaymentStatus" AS ENUM ('READY', 'PROCESSING', 'PAID', 'FAILED', 'CANCELED', 'REFUNDED');
CREATE TYPE "PremiumMembershipStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELED');

CREATE TABLE "payment_products" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "type" "PaymentProductType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "coin_amount" DECIMAL(18,4),
    "premium_days" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_products_code_key" ON "payment_products"("code");
CREATE INDEX "payment_products_type_active_sort_order_idx" ON "payment_products"("type", "active", "sort_order");

CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "type" "PaymentProductType" NOT NULL,
    "provider" "PaymentProviderKind" NOT NULL DEFAULT 'TOSS',
    "order_id" TEXT NOT NULL,
    "payment_key" TEXT,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'READY',
    "checkout_token" TEXT,
    "checkout_token_expires_at" TIMESTAMPTZ(6),
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMPTZ(6),
    "canceled_at" TIMESTAMPTZ(6),
    "provider_payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");
CREATE UNIQUE INDEX "payments_checkout_token_key" ON "payments"("checkout_token");
CREATE INDEX "payments_user_id_created_at_idx" ON "payments"("user_id", "created_at" DESC);
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at" DESC);

ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "payment_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "payment_provider_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "provider" "PaymentProviderKind" NOT NULL DEFAULT 'TOSS',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "environment" "PaymentEnvironment" NOT NULL DEFAULT 'TEST',
    "client_key" TEXT,
    "secret_key_encrypted" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_provider_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "premium_memberships" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "PremiumMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "last_payment_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "premium_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "premium_memberships_user_id_key" ON "premium_memberships"("user_id");
CREATE UNIQUE INDEX "premium_memberships_last_payment_id_key" ON "premium_memberships"("last_payment_id");
CREATE INDEX "premium_memberships_expires_at_idx" ON "premium_memberships"("expires_at");

ALTER TABLE "premium_memberships" ADD CONSTRAINT "premium_memberships_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "premium_memberships" ADD CONSTRAINT "premium_memberships_last_payment_id_fkey"
    FOREIGN KEY ("last_payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default provider settings row
INSERT INTO "payment_provider_settings" ("id", "provider", "enabled", "environment", "updated_at")
VALUES ('default', 'TOSS', false, 'TEST', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Seed TEST payment products (prices adjustable via admin later)
INSERT INTO "payment_products" ("id", "code", "type", "name", "description", "price", "coin_amount", "premium_days", "active", "sort_order", "updated_at")
VALUES
    (gen_random_uuid(), 'COIN_10000', 'COIN_CHARGE', '코인 10,000', '10,000 Coin 충전', 10000, 10000, NULL, true, 10, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'COIN_30000', 'COIN_CHARGE', '코인 30,000', '30,000 Coin 충전', 30000, 30000, NULL, true, 20, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'COIN_50000', 'COIN_CHARGE', '코인 50,000', '50,000 Coin 충전', 50000, 50000, NULL, true, 30, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'PREMIUM_30D', 'PREMIUM_PASS', '프리미엄 30일', '프리미엄 회원 30일 이용권', 9900, NULL, 30, true, 100, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
