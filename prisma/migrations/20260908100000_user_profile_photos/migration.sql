-- CreateTable
CREATE TABLE "user_profile_photos" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "object_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_profile_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_profile_photos_user_id_sort_order_idx" ON "user_profile_photos"("user_id", "sort_order");

-- AddForeignKey
ALTER TABLE "user_profile_photos" ADD CONSTRAINT "user_profile_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
