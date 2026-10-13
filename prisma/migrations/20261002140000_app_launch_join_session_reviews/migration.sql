-- App launch settings (per app variant) + join session reviews (title/content/photos)

CREATE TABLE "app_launch_settings" (
    "app_variant" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "image_object_key" TEXT,
    "display_duration_ms" INTEGER NOT NULL DEFAULT 2000,
    "updated_by_user_id" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_launch_settings_pkey" PRIMARY KEY ("app_variant")
);

ALTER TABLE "app_launch_settings" ADD CONSTRAINT "app_launch_settings_updated_by_user_id_fkey"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "app_launch_settings" ("app_variant", "enabled", "display_duration_ms", "updated_at")
VALUES ('development', true, 2000, NOW())
ON CONFLICT ("app_variant") DO NOTHING;

CREATE TABLE "join_session_reviews" (
    "id" UUID NOT NULL,
    "join_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "title" VARCHAR(60) NOT NULL,
    "content" VARCHAR(2000) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "join_session_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "join_session_reviews_join_id_author_user_id_key"
    ON "join_session_reviews"("join_id", "author_user_id");

CREATE INDEX "join_session_reviews_join_id_idx" ON "join_session_reviews"("join_id");

ALTER TABLE "join_session_reviews" ADD CONSTRAINT "join_session_reviews_join_id_fkey"
    FOREIGN KEY ("join_id") REFERENCES "joins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "join_session_reviews" ADD CONSTRAINT "join_session_reviews_author_user_id_fkey"
    FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "join_session_review_photos" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "object_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "join_session_review_photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "join_session_review_photos_review_id_sort_order_idx"
    ON "join_session_review_photos"("review_id", "sort_order");

ALTER TABLE "join_session_review_photos" ADD CONSTRAINT "join_session_review_photos_review_id_fkey"
    FOREIGN KEY ("review_id") REFERENCES "join_session_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
