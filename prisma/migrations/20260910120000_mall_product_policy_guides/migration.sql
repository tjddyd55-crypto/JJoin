-- Mall product policy guide fields (usage, validity, exchange/refund, notice)
ALTER TABLE "mall_products" ADD COLUMN IF NOT EXISTS "usage_guide" TEXT;
ALTER TABLE "mall_products" ADD COLUMN IF NOT EXISTS "validity_guide" TEXT;
ALTER TABLE "mall_products" ADD COLUMN IF NOT EXISTS "exchange_refund_guide" TEXT;
ALTER TABLE "mall_products" ADD COLUMN IF NOT EXISTS "notice_guide" TEXT;
