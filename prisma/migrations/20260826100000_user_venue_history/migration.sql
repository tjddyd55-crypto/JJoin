-- User venue recent + favorite for Join Create picker

CREATE TABLE "user_venue_recents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "venue_id" UUID NOT NULL,
    "last_used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_venue_recents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_venue_favorites" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "venue_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_venue_favorites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_venue_recents_user_id_venue_id_key" ON "user_venue_recents"("user_id", "venue_id");
CREATE INDEX "user_venue_recents_user_id_last_used_at_idx" ON "user_venue_recents"("user_id", "last_used_at" DESC);

CREATE UNIQUE INDEX "user_venue_favorites_user_id_venue_id_key" ON "user_venue_favorites"("user_id", "venue_id");
CREATE INDEX "user_venue_favorites_user_id_created_at_idx" ON "user_venue_favorites"("user_id", "created_at" DESC);

ALTER TABLE "user_venue_recents" ADD CONSTRAINT "user_venue_recents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_venue_recents" ADD CONSTRAINT "user_venue_recents_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_venue_favorites" ADD CONSTRAINT "user_venue_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_venue_favorites" ADD CONSTRAINT "user_venue_favorites_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
