-- Player subjective reviews (★1–5 + optional one-line). Orthogonal to attendance reliability.

CREATE TYPE "PlayerReviewVisibility" AS ENUM ('VISIBLE', 'HIDDEN');

CREATE TABLE "player_reviews" (
    "id" UUID NOT NULL,
    "join_id" UUID NOT NULL,
    "reviewer_user_id" UUID NOT NULL,
    "reviewee_user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(100),
    "visibility" "PlayerReviewVisibility" NOT NULL DEFAULT 'VISIBLE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "player_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "player_reviews_join_id_reviewer_user_id_reviewee_user_id_key" ON "player_reviews"("join_id", "reviewer_user_id", "reviewee_user_id");

CREATE INDEX "player_reviews_reviewee_user_id_visibility_created_at_idx" ON "player_reviews"("reviewee_user_id", "visibility", "created_at" DESC);

CREATE INDEX "player_reviews_reviewer_user_id_created_at_idx" ON "player_reviews"("reviewer_user_id", "created_at" DESC);

CREATE INDEX "player_reviews_join_id_idx" ON "player_reviews"("join_id");

ALTER TABLE "player_reviews" ADD CONSTRAINT "player_reviews_join_id_fkey" FOREIGN KEY ("join_id") REFERENCES "joins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "player_reviews" ADD CONSTRAINT "player_reviews_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "player_reviews" ADD CONSTRAINT "player_reviews_reviewee_user_id_fkey" FOREIGN KEY ("reviewee_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
