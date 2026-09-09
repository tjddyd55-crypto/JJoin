-- Mall product detail content blocks (HEADING / TEXT / IMAGE / NOTICE)

CREATE TYPE "MallContentBlockType" AS ENUM ('HEADING', 'TEXT', 'IMAGE', 'NOTICE');

CREATE TABLE "mall_product_content_blocks" (
    "id" TEXT NOT NULL,
    "product_id" UUID NOT NULL,
    "type" "MallContentBlockType" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "text" TEXT,
    "image_object_key" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mall_product_content_blocks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mall_product_content_blocks_product_id_sort_order_idx" ON "mall_product_content_blocks"("product_id", "sort_order");

ALTER TABLE "mall_product_content_blocks" ADD CONSTRAINT "mall_product_content_blocks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "mall_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
