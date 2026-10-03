-- Join review community board (independent of Join session reviews).

CREATE TABLE "join_review_posts" (
    "id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "title" VARCHAR(60) NOT NULL,
    "content" VARCHAR(2000) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "join_review_posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "join_review_post_photos" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "object_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "join_review_post_photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "join_review_posts_created_at_idx" ON "join_review_posts"("created_at" DESC);
CREATE INDEX "join_review_posts_author_user_id_created_at_idx" ON "join_review_posts"("author_user_id", "created_at" DESC);
CREATE INDEX "join_review_post_photos_post_id_sort_order_idx" ON "join_review_post_photos"("post_id", "sort_order");

ALTER TABLE "join_review_posts" ADD CONSTRAINT "join_review_posts_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "join_review_post_photos" ADD CONSTRAINT "join_review_post_photos_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "join_review_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
