-- Variable coin purchase: order snapshot columns + COIN_CUSTOM product

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "coin_amount" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "coin_krw_rate" INTEGER;

INSERT INTO "payment_products" (
  "id",
  "code",
  "type",
  "name",
  "description",
  "price",
  "coin_amount",
  "premium_days",
  "active",
  "sort_order",
  "created_at",
  "updated_at"
)
VALUES (
  gen_random_uuid(),
  'COIN_CUSTOM',
  'COIN_CHARGE',
  '코인 충전',
  'Variable coin top-up (amount set per order)',
  0,
  NULL,
  NULL,
  true,
  5,
  NOW(),
  NOW()
)
ON CONFLICT ("code") DO UPDATE SET
  "type" = EXCLUDED."type",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "active" = true,
  "coin_amount" = NULL,
  "updated_at" = NOW();
