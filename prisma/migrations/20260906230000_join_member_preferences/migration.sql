-- Join member preference fields (standard joins)
CREATE TYPE "JoinPreferredGender" AS ENUM ('ANY', 'MALE', 'FEMALE');

ALTER TABLE "joins" ADD COLUMN "preferred_gender" "JoinPreferredGender";
ALTER TABLE "joins" ADD COLUMN "min_age" INTEGER;
ALTER TABLE "joins" ADD COLUMN "max_age" INTEGER;

-- Friendship notifications
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FRIEND_REQUEST_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FRIEND_REQUEST_ACCEPTED';
