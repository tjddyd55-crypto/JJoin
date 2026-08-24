-- AlterTable
ALTER TABLE "venues" ADD COLUMN     "golf_facility_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "venues_golf_facility_id_key" ON "venues"("golf_facility_id");

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_golf_facility_id_fkey" FOREIGN KEY ("golf_facility_id") REFERENCES "golf_facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

