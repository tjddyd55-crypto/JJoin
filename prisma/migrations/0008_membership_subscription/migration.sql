-- Membership / Subscription / Entitlement SSOT (additive)
-- FREE users do not require a Subscription row.

CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE', 'PENDING');
CREATE TYPE "SubscriptionSource" AS ENUM ('ADMIN_TEST', 'ADMIN_GRANT', 'APP_STORE', 'PLAY_STORE', 'WEB_PG');
CREATE TYPE "SubscriptionAuditAction" AS ENUM ('ACTIVATED', 'CANCEL_SCHEDULED', 'EXPIRED', 'MARKED_PAST_DUE', 'ADMIN_ADJUSTED');

CREATE TABLE "membership_plans" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_i18n_key" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "price_amount" DECIMAL(18,4),
    "currency" CHAR(3),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "membership_plans_code_key" ON "membership_plans"("code");

CREATE TABLE "membership_plan_entitlements" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "entitlement_code" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_plan_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "membership_plan_entitlements_plan_id_entitlement_code_key" ON "membership_plan_entitlements"("plan_id", "entitlement_code");
CREATE INDEX "membership_plan_entitlements_entitlement_code_idx" ON "membership_plan_entitlements"("entitlement_code");

CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "current_period_start" TIMESTAMPTZ(6) NOT NULL,
    "current_period_end" TIMESTAMPTZ(6) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),
    "source" "SubscriptionSource" NOT NULL DEFAULT 'ADMIN_TEST',
    "provider" TEXT,
    "provider_subscription_id" TEXT,
    "reference_id" TEXT,
    "reason" TEXT,
    "created_by_admin_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscriptions_user_id_reference_id_key" ON "subscriptions"("user_id", "reference_id");
CREATE INDEX "subscriptions_user_id_status_current_period_end_idx" ON "subscriptions"("user_id", "status", "current_period_end");
CREATE INDEX "subscriptions_plan_id_status_idx" ON "subscriptions"("plan_id", "status");
CREATE INDEX "subscriptions_provider_provider_subscription_id_idx" ON "subscriptions"("provider", "provider_subscription_id");

CREATE TABLE "subscription_audit_events" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "action" "SubscriptionAuditAction" NOT NULL,
    "actor_user_id" UUID,
    "reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "subscription_audit_events_subscription_id_created_at_idx" ON "subscription_audit_events"("subscription_id", "created_at");

ALTER TABLE "membership_plan_entitlements" ADD CONSTRAINT "membership_plan_entitlements_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscription_audit_events" ADD CONSTRAINT "subscription_audit_events_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscription_audit_events" ADD CONSTRAINT "subscription_audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed plans (stable codes). PREMIUM entitlements only — FREE has none.
INSERT INTO "membership_plans" ("id", "code", "name_i18n_key", "is_active", "price_amount", "currency", "created_at", "updated_at")
VALUES
  ('11111111-1111-1111-1111-111111111111', 'FREE', 'membership.plan.free', true, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('22222222-2222-2222-2222-222222222222', 'PREMIUM', 'membership.plan.premium', true, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "membership_plan_entitlements" ("id", "plan_id", "entitlement_code", "created_at")
VALUES
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'ROOM_CREATION_FEE_WAIVER', CURRENT_TIMESTAMP);
