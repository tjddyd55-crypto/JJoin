-- Join Mall MVP: products, categories, orders, admin scope, shop purchase tx type

CREATE TYPE "MallProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SOLD_OUT', 'PAUSED', 'ARCHIVED');
CREATE TYPE "MallOrderStatus" AS ENUM ('COMPLETED', 'CANCELLED');
CREATE TYPE "AdminLoginScope" AS ENUM ('PLATFORM', 'MALL_MD');

ALTER TYPE "CoinTxType" ADD VALUE IF NOT EXISTS 'SHOP_PURCHASE';

ALTER TABLE "admin_login_credentials" ADD COLUMN IF NOT EXISTS "scope" "AdminLoginScope" NOT NULL DEFAULT 'PLATFORM';

CREATE TABLE "mall_categories" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mall_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mall_categories_code_key" ON "mall_categories"("code");

CREATE TABLE "mall_products" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "short_description" TEXT,
    "description" TEXT,
    "exchange_guide" TEXT,
    "coin_price" DECIMAL(18,4) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "status" "MallProductStatus" NOT NULL DEFAULT 'DRAFT',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "badge" TEXT,
    "cover_image_key" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mall_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mall_products_slug_key" ON "mall_products"("slug");
CREATE INDEX "mall_products_category_id_status_sort_order_idx" ON "mall_products"("category_id", "status", "sort_order");
CREATE INDEX "mall_products_status_sort_order_idx" ON "mall_products"("status", "sort_order");

ALTER TABLE "mall_products" ADD CONSTRAINT "mall_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "mall_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "mall_product_images" (
    "id" TEXT NOT NULL,
    "product_id" UUID NOT NULL,
    "object_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mall_product_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mall_product_images_product_id_sort_order_idx" ON "mall_product_images"("product_id", "sort_order");

ALTER TABLE "mall_product_images" ADD CONSTRAINT "mall_product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "mall_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "mall_orders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "status" "MallOrderStatus" NOT NULL DEFAULT 'COMPLETED',
    "coin_price" DECIMAL(18,4) NOT NULL,
    "product_name_snapshot" TEXT NOT NULL,
    "cover_image_key_snapshot" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mall_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mall_orders_user_id_created_at_idx" ON "mall_orders"("user_id", "created_at");

ALTER TABLE "mall_orders" ADD CONSTRAINT "mall_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mall_orders" ADD CONSTRAINT "mall_orders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "mall_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed categories
INSERT INTO "mall_categories" ("id", "code", "name", "sort_order", "updated_at") VALUES
  ('a1000001-0000-4000-8000-000000000001', 'golf-gear', '골프용품', 1, NOW()),
  ('a1000001-0000-4000-8000-000000000002', 'apparel', '의류', 2, NOW()),
  ('a1000001-0000-4000-8000-000000000003', 'food-beverage', '식음료', 3, NOW()),
  ('a1000001-0000-4000-8000-000000000004', 'other', '기타', 4, NOW());

-- Seed demo products (cover keys are public demo image URLs)
INSERT INTO "mall_products" ("id", "category_id", "name", "slug", "short_description", "description", "exchange_guide", "coin_price", "stock", "status", "sort_order", "badge", "cover_image_key", "updated_at") VALUES
  ('b2000001-0000-4000-8000-000000000001', 'a1000001-0000-4000-8000-000000000001', '프리미엄 골프 장갑', 'premium-golf-glove', '그립감과 내구성을 갖춘 리워드 장갑', '조인 활동으로 모은 코인으로 교환하는 골프 장갑입니다. 손바닥 미끄럼 방지 처리와 통기성 메쉬를 적용했습니다.', '앱 내 구매 완료 후 MY > 구매내역에서 교환 코드를 확인할 수 있습니다.', 2000, 42, 'ACTIVE', 1, 'NEW', 'https://images.unsplash.com/photo-1593111775730-d90fa435bad2?w=800&q=80', NOW()),
  ('b2000001-0000-4000-8000-000000000002', 'a1000001-0000-4000-8000-000000000001', '3구 프리미엄 골프공 세트', 'premium-golf-ball-set', '라운드에 바로 쓰는 3구 세트', '비거리와 스핀 밸런스를 고려한 데모용 골프공 세트입니다.', '배송 없이 제휴 스크린샵에서 수령 가능합니다.', 3500, 28, 'ACTIVE', 2, '인기', 'https://images.unsplash.com/photo-1535131749006-b7d58c4b7914?w=800&q=80', NOW()),
  ('b2000001-0000-4000-8000-000000000003', 'a1000001-0000-4000-8000-000000000003', '스포츠 음료 쿠폰', 'sports-drink-coupon', '라운드 전후 수분 충전', '제휴 편의점에서 사용 가능한 음료 교환권입니다.', '구매 후 30일 이내 사용해 주세요.', 800, 120, 'ACTIVE', 3, NULL, 'https://images.unsplash.com/photo-1622543830465-9e386d9ea3ab?w=800&q=80', NOW()),
  ('b2000001-0000-4000-8000-000000000004', 'a1000001-0000-4000-8000-000000000004', '스크린 1회 이용권', 'screen-golf-pass', '가까운 제휴 스크린에서 1회 이용', '조인 보상 코인으로 교환하는 스크린 골프 1회 이용권입니다.', '예약 시 쪼인존 앱 구매내역을 제시해 주세요.', 4500, 15, 'ACTIVE', 4, '추천', 'https://images.unsplash.com/photo-1587174486073-67eaad3b0f90?w=800&q=80', NOW()),
  ('b2000001-0000-4000-8000-000000000005', 'a1000001-0000-4000-8000-000000000002', '쿨링 스포츠 타월', 'cooling-sports-towel', '라운드 중 시원하게', '흡수력이 좋은 스포츠 타월로 여름 라운드에 적합합니다.', '택배 수령 또는 제휴 매장 픽업 중 선택 가능합니다.', 1500, 0, 'SOLD_OUT', 5, '품절', 'https://images.unsplash.com/photo-1556906781-95a6e6efcb0f?w=800&q=80', NOW()),
  ('b2000001-0000-4000-8000-000000000006', 'a1000001-0000-4000-8000-000000000002', 'UV 차단 골프 모자', 'uv-golf-cap', '햇빛은 막고 스타일은 살린 모자', '깊은 챙과 통기 메쉬로 필드 라운드에 적합합니다.', '색상은 랜덤 발송됩니다.', 2200, 36, 'ACTIVE', 6, NULL, 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=800&q=80', NOW()),
  ('b2000001-0000-4000-8000-000000000007', 'a1000001-0000-4000-8000-000000000001', '골프 티 세트', 'golf-tee-set', '다양한 높이의 티 20개', '드라이버·아이언용 티를 한 세트로 제공합니다.', '구매 후 MY > 구매내역에서 수령 안내를 확인하세요.', 600, 80, 'ACTIVE', 7, NULL, 'https://images.unsplash.com/photo-1596727147705-61a532a659e4?w=800&q=80', NOW()),
  ('b2000001-0000-4000-8000-000000000008', 'a1000001-0000-4000-8000-000000000003', '에너지 바 3개 세트', 'energy-bar-set', '라운드 중 간식으로', '고단백 에너지 바 3개 세트입니다.', '유통기한은 수령 시 안내드립니다.', 900, 55, 'PAUSED', 8, NULL, 'https://images.unsplash.com/photo-1606313564200-e75d5e3048fe?w=800&q=80', NOW());
