-- PresenceVisibility + user_presences (MVP: no location history, no PostGIS required)
CREATE TYPE "PresenceVisibility" AS ENUM ('HIDDEN', 'AVAILABLE');

CREATE TABLE "user_presences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "visibility" "PresenceVisibility" NOT NULL DEFAULT 'HIDDEN',
    "available_until" TIMESTAMPTZ(6),
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "accuracy_meters" DOUBLE PRECISION,
    "last_location_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_presences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_presences_user_id_key" ON "user_presences"("user_id");
CREATE INDEX "user_presences_visibility_available_until_idx" ON "user_presences"("visibility", "available_until");
CREATE INDEX "user_presences_last_location_at_idx" ON "user_presences"("last_location_at");

ALTER TABLE "user_presences" ADD CONSTRAINT "user_presences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
